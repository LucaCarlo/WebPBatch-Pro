const fs = require('fs');
const path = require('path');
const os = require('os');
const { convertImage } = require('./converter');
const { applyWatermark } = require('./watermark');
const { generateName, getUniquePath, getOutputExtension } = require('./naming');

/**
 * Process a queue of image files.
 * Returns a controller object with pause/resume/cancel.
 */
function processQueue(fileList, settings, callbacks) {
  let paused = false;
  let cancelled = false;
  // Support multiple concurrent waiters for pause
  const pauseWaiters = [];

  const threadCount = settings.threads === 'auto'
    ? Math.max(1, Math.min(os.cpus().length - 1, 8))
    : parseInt(settings.threads) || 2;

  const report = {
    total: fileList.length,
    processed: 0,
    errors: 0,
    skipped: 0,
    totalInputSize: 0,
    totalOutputSize: 0,
    startTime: Date.now(),
    endTime: null,
    files: []
  };

  const outputExt = getOutputExtension(settings.format);

  // Determine output directory
  function getOutputDir(file) {
    if (settings.outputFolder) {
      return settings.outputFolder;
    }
    return path.join(file.dir, 'optimized');
  }

  async function processFile(file, index) {
    if (cancelled) return null;

    // Wait if paused — each waiter gets its own resolve
    while (paused && !cancelled) {
      await new Promise(resolve => { pauseWaiters.push(resolve); });
    }
    if (cancelled) return null;

    // Notify file is being processed
    if (callbacks.onFileComplete) {
      // Send "processing" status so UI can update
    }

    const startTime = Date.now();
    const fileReport = {
      name: file.name,
      inputPath: file.path,
      inputSize: file.size,
      outputSize: 0,
      format: settings.format || 'webp',
      quality: settings.quality || 80,
      time: 0,
      status: 'processing',
      error: null
    };

    try {
      const outputDir = getOutputDir(file);
      await fs.promises.mkdir(outputDir, { recursive: true });

      const namingTemplate = settings.namingTemplate || '{name}';

      // Convert
      const resizeMode = settings.resizeMode || 'none';
      const convertOptions = {
        format: settings.format || 'webp',
        quality: settings.quality || 80,
        lossless: settings.lossless || false,
        resize: resizeMode,
        longEdge: settings.longEdge,
        width: resizeMode === 'crop' ? settings.cropWidth : settings.resizeWidth,
        height: resizeMode === 'crop' ? settings.cropHeight : settings.resizeHeight,
        maintainAspect: settings.maintainAspect !== false,
        sharpen: settings.sharpen || false,
        stripMetadata: settings.stripMetadata !== false,
        privacyMode: settings.privacyMode || false,
        keepIcc: settings.keepIcc || false,
        pngQuantize: settings.pngQuantize || false
      };

      const result = await convertImage(file.path, convertOptions);

      let outputBuffer = result.buffer;

      // Smart mode: if savings are below threshold, skip
      if (settings.smartMode) {
        const savedPercent = ((file.size - outputBuffer.length) / file.size) * 100;
        if (settings.smartMinSaving && savedPercent < parseFloat(settings.smartMinSaving)) {
          fileReport.status = 'skipped';
          fileReport.outputSize = file.size;
          fileReport.time = Date.now() - startTime;
          report.files.push(fileReport);
          report.processed++;
          report.skipped++;
          report.totalInputSize += file.size;
          report.totalOutputSize += file.size;

          if (callbacks.onFileComplete) {
            callbacks.onFileComplete(fileReport);
          }
          return fileReport;
        }

        // Target size mode
        if (settings.smartTargetSize) {
          const targetBytes = parseInt(settings.smartTargetSize) * 1024;
          if (outputBuffer.length > targetBytes) {
            let q = parseInt(settings.quality) || 80;
            while (outputBuffer.length > targetBytes && q > 10) {
              q -= 10;
              const retry = await convertImage(file.path, {
                ...convertOptions,
                quality: q
              });
              outputBuffer = retry.buffer;
            }
          }
        }
      }

      // Apply watermark (Pro)
      if (settings.watermark && (settings.watermark.text || settings.watermark.imagePath)) {
        outputBuffer = await applyWatermark(outputBuffer, {
          width: result.info.width,
          height: result.info.height
        }, settings.watermark);
      }

      // Generate final filename with actual dimensions
      const finalFileName = generateName(namingTemplate, {
        originalName: file.name,
        width: result.info.width,
        height: result.info.height,
        counter: index + 1
      }, outputExt);

      // Get unique path (handle duplicates)
      let outputPath;
      if (settings.duplicateMode === 'overwrite') {
        outputPath = path.join(outputDir, finalFileName);
      } else if (settings.duplicateMode === 'skip') {
        outputPath = path.join(outputDir, finalFileName);
        if (fs.existsSync(outputPath)) {
          fileReport.status = 'skipped';
          fileReport.outputSize = 0;
          fileReport.time = Date.now() - startTime;
          report.files.push(fileReport);
          report.processed++;
          report.skipped++;
          report.totalInputSize += file.size;

          if (callbacks.onFileComplete) {
            callbacks.onFileComplete(fileReport);
          }
          return fileReport;
        }
      } else {
        outputPath = getUniquePath(outputDir, finalFileName);
      }

      // Write to temp file, then rename (atomic)
      const tmpPath = outputPath + '.tmp';
      await fs.promises.writeFile(tmpPath, outputBuffer);
      await fs.promises.rename(tmpPath, outputPath);

      fileReport.outputPath = outputPath;
      fileReport.outputSize = outputBuffer.length;
      fileReport.width = result.info.width;
      fileReport.height = result.info.height;
      fileReport.status = 'done';
      fileReport.time = Date.now() - startTime;
      fileReport.savedPercent = Math.round(((file.size - outputBuffer.length) / file.size) * 100);

      report.files.push(fileReport);
      report.processed++;
      report.totalInputSize += file.size;
      report.totalOutputSize += outputBuffer.length;

      if (callbacks.onFileComplete) {
        callbacks.onFileComplete(fileReport);
      }

      return fileReport;

    } catch (err) {
      fileReport.status = 'error';
      fileReport.error = err.message;
      fileReport.time = Date.now() - startTime;
      report.files.push(fileReport);
      report.processed++;
      report.errors++;
      report.totalInputSize += file.size;

      if (callbacks.onFileError) {
        callbacks.onFileError(fileReport);
      }

      return fileReport;
    }
  }

  // Run with concurrency limit
  async function run() {
    const queue = [...fileList];
    let index = 0;
    const activePromises = new Set();

    while ((index < queue.length || activePromises.size > 0) && !cancelled) {
      // Fill up to threadCount
      while (activePromises.size < threadCount && index < queue.length && !cancelled) {
        const currentIndex = index;
        const file = queue[index];
        index++;

        const promise = processFile(file, currentIndex).then(() => {
          activePromises.delete(promise);
          if (callbacks.onProgress) {
            callbacks.onProgress({
              processed: report.processed,
              total: report.total,
              errors: report.errors,
              percent: Math.round((report.processed / report.total) * 100)
            });
          }
        });
        activePromises.add(promise);
      }

      // Wait for at least one to finish
      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }
    }

    // Wait for remaining
    await Promise.all(activePromises);

    report.endTime = Date.now();
    report.totalTime = report.endTime - report.startTime;
    report.savedPercent = report.totalInputSize > 0
      ? Math.round(((report.totalInputSize - report.totalOutputSize) / report.totalInputSize) * 100)
      : 0;
    report.savedBytes = report.totalInputSize - report.totalOutputSize;

    if (!cancelled && callbacks.onComplete) {
      callbacks.onComplete(report);
    }
  }

  // Start processing
  run().catch(err => {
    if (callbacks.onComplete) {
      report.endTime = Date.now();
      report.totalTime = report.endTime - report.startTime;
      report.error = err.message;
      callbacks.onComplete(report);
    }
  });

  // Return controller
  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      // Wake up ALL waiting workers
      while (pauseWaiters.length > 0) {
        const resolve = pauseWaiters.shift();
        resolve();
      }
    },
    cancel() {
      cancelled = true;
      // Wake up all paused workers so they can exit
      while (pauseWaiters.length > 0) {
        const resolve = pauseWaiters.shift();
        resolve();
      }
    }
  };
}

module.exports = { processQueue };
