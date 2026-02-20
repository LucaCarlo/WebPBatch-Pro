const fs = require('fs');
const path = require('path');
const { SUPPORTED_EXTENSIONS } = require('./scanner');
const { convertImage } = require('./converter');
const { getOutputExtension } = require('./naming');

/**
 * Watch a folder for new images and auto-process them.
 * @param {string} folderPath
 * @param {object} settings - conversion settings
 * @param {object} callbacks - { onNewFile, onProcessed, onError }
 * @returns {{ stop: Function }}
 */
function startWatcher(folderPath, settings, callbacks) {
  const processedFiles = new Set();
  let watcher = null;

  // Debounce to avoid duplicate events
  const debounceMap = new Map();

  function isImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  }

  async function processNewFile(filePath) {
    if (processedFiles.has(filePath)) return;
    processedFiles.add(filePath);

    try {
      // Wait a bit for file to finish writing
      await new Promise(r => setTimeout(r, 500));

      if (!fs.existsSync(filePath)) return;

      if (callbacks.onNewFile) callbacks.onNewFile(filePath);

      const stat = fs.statSync(filePath);
      const outputExt = getOutputExtension(settings.format);
      const outputDir = settings.outputFolder || path.join(path.dirname(filePath), 'optimized');

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const baseName = path.parse(path.basename(filePath)).name;
      const outputPath = path.join(outputDir, baseName + outputExt);

      const result = await convertImage(filePath, {
        format: settings.format || 'webp',
        quality: settings.quality || 80,
        resize: settings.resizeMode || 'none',
        longEdge: settings.longEdge,
        maintainAspect: true,
        stripMetadata: settings.stripMetadata !== false
      });

      const tmpPath = outputPath + '.tmp';
      fs.writeFileSync(tmpPath, result.buffer);
      fs.renameSync(tmpPath, outputPath);

      if (callbacks.onProcessed) {
        callbacks.onProcessed({
          inputPath: filePath,
          outputPath,
          inputSize: stat.size,
          outputSize: result.buffer.length,
          savedPercent: Math.round(((stat.size - result.buffer.length) / stat.size) * 100)
        });
      }
    } catch (err) {
      if (callbacks.onError) callbacks.onError({ file: filePath, error: err.message });
    }
  }

  try {
    watcher = fs.watch(folderPath, { persistent: true }, (eventType, filename) => {
      if (!filename || eventType !== 'rename') return;
      const fullPath = path.join(folderPath, filename);

      // Debounce
      if (debounceMap.has(fullPath)) {
        clearTimeout(debounceMap.get(fullPath));
      }

      debounceMap.set(fullPath, setTimeout(() => {
        debounceMap.delete(fullPath);
        if (fs.existsSync(fullPath) && isImage(fullPath)) {
          processNewFile(fullPath);
        }
      }, 300));
    });
  } catch (err) {
    if (callbacks.onError) callbacks.onError({ error: err.message });
  }

  return {
    stop() {
      if (watcher) {
        watcher.close();
        watcher = null;
      }
      for (const timeout of debounceMap.values()) {
        clearTimeout(timeout);
      }
      debounceMap.clear();
    }
  };
}

function stopWatcher(watcher) {
  if (watcher) watcher.stop();
}

module.exports = { startWatcher, stopWatcher };
