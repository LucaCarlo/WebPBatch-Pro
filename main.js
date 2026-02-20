const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { scanDirectory } = require('./lib/scanner');
const { processQueue } = require('./lib/processor');
const { loadPresets, savePreset, deletePreset, exportPreset, importPreset } = require('./lib/presets');
const { validateLicense, saveLicense, getLicenseStatus } = require('./lib/license');
const { getLogger } = require('./lib/logger');
const { startWatcher, stopWatcher } = require('./lib/watcher');
const { AIProvider } = require('./lib/ai-provider');
const { thumbnailBoost } = require('./lib/thumbnail-boost');
const { smartCrop } = require('./lib/smart-crop');
const { multiExport, PLATFORMS } = require('./lib/multi-export');
const { findDuplicates } = require('./lib/duplicate-detect');
const { replaceBackgroundByColor, aiBackgroundBlur } = require('./lib/background-replace');
const { generateResponsiveSet } = require('./lib/responsive-gen');

let mainWindow;
let processorController = null;
let logger;
let aiProvider = null;

function initLogger() {
  const logDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'logs')
    : path.join(__dirname, 'logs');
  logger = getLogger(logDir);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'WebPBatch Pro',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: '#f8f9fa'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initLogger();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──

// Scan files
ipcMain.handle('scan-files', async (event, paths, includeSubfolders) => {
  try {
    if (logger) logger.info('Scanning files', { paths, includeSubfolders });
    const files = await scanDirectory(paths, includeSubfolders);
    if (logger) logger.info(`Found ${files.length} images`);
    return { success: true, files };
  } catch (err) {
    if (logger) logger.error('Scan failed', err);
    return { success: false, error: err.message };
  }
});

// Browse input files (Windows doesn't support openFile + openDirectory together)
ipcMain.handle('browse-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Seleziona immagini',
    filters: [
      { name: 'Immagini', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'tif', 'bmp'] },
      { name: 'Tutti i file', extensions: ['*'] }
    ]
  });
  if (result.canceled) return { success: false };
  return { success: true, paths: result.filePaths };
});

// Browse input folders
ipcMain.handle('browse-folders', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections'],
    title: 'Seleziona cartelle con immagini'
  });
  if (result.canceled) return { success: false };
  return { success: true, paths: result.filePaths };
});

// Start conversion
ipcMain.handle('start-conversion', async (event, fileList, settings) => {
  try {
    if (logger) logger.info('Starting conversion', { fileCount: fileList.length });

    processorController = processQueue(fileList, settings, {
      onProgress: (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('conversion-progress', data);
        }
      },
      onFileComplete: (data) => {
        if (logger) logger.info('File converted', { file: data.name, saved: data.savedPercent + '%' });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('conversion-file-complete', data);
        }
      },
      onFileError: (data) => {
        if (logger) logger.error('File error', { file: data.name, error: data.error });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('conversion-file-error', data);
        }
      },
      onComplete: (report) => {
        if (logger) logger.info('Conversion complete', { total: report.total, errors: report.errors, savedPercent: report.savedPercent });
        processorController = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('conversion-complete', report);
        }
      }
    });

    return { success: true };
  } catch (err) {
    if (logger) logger.error('Conversion start failed', err);
    return { success: false, error: err.message };
  }
});

// Pause/Resume/Cancel
ipcMain.handle('pause-conversion', () => {
  if (processorController) processorController.pause();
  return { success: true };
});

ipcMain.handle('resume-conversion', () => {
  if (processorController) processorController.resume();
  return { success: true };
});

ipcMain.handle('cancel-conversion', () => {
  if (processorController) {
    processorController.cancel();
    processorController = null;
  }
  return { success: true };
});

// Select output folder
ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Scegli cartella output'
  });
  if (result.canceled) return { success: false };
  return { success: true, path: result.filePaths[0] };
});

// Select watermark image
ipcMain.handle('select-watermark-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Scegli immagine watermark',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (result.canceled) return { success: false };
  return { success: true, path: result.filePaths[0] };
});

// Open folder in OS file manager
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(path.normalize(folderPath));
  } catch { /* ignore */ }
  return { success: true };
});

// Presets
ipcMain.handle('load-presets', async () => {
  const userPresetsDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'presets')
    : path.join(__dirname, 'presets');
  const builtinDir = path.join(__dirname, 'presets');
  return await loadPresets(builtinDir, userPresetsDir);
});

ipcMain.handle('save-preset', async (event, preset) => {
  const userPresetsDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'presets')
    : path.join(__dirname, 'presets');
  return await savePreset(userPresetsDir, preset);
});

ipcMain.handle('delete-preset', async (event, presetId) => {
  const userPresetsDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'presets')
    : path.join(__dirname, 'presets');
  return await deletePreset(userPresetsDir, presetId);
});

ipcMain.handle('export-preset', async (event, preset) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Esporta Preset',
    defaultPath: `${preset.name}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled) return { success: false };
  return await exportPreset(result.filePath, preset);
});

ipcMain.handle('import-preset', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importa Preset',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled) return { success: false };
  return await importPreset(result.filePaths[0]);
});

// License
ipcMain.handle('get-license-status', () => {
  const licensePath = path.join(app.getPath('userData'), 'license.json');
  return getLicenseStatus(licensePath);
});

ipcMain.handle('activate-license', (event, key) => {
  const licensePath = path.join(app.getPath('userData'), 'license.json');
  const result = validateLicense(key);
  if (result.valid) {
    saveLicense(licensePath, { key, activatedAt: new Date().toISOString() });
  }
  return result;
});

ipcMain.handle('deactivate-license', () => {
  const licensePath = path.join(app.getPath('userData'), 'license.json');
  try {
    if (fs.existsSync(licensePath)) fs.unlinkSync(licensePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Logging
ipcMain.handle('copy-log', async () => {
  try {
    const logContent = logger ? logger.getRecentLog() : 'No log available';
    clipboard.writeText(logContent);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export CSV report
ipcMain.handle('export-csv', async (event, reportData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Esporta Report CSV',
    defaultPath: `webpbatch-report-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (result.canceled) return { success: false };

  try {
    const header = 'File,Input Size (bytes),Output Size (bytes),Format,Quality,Time (ms),Status,Error\n';
    const rows = reportData.files.map(f =>
      `"${f.name}",${f.inputSize},${f.outputSize || ''},"${f.format}",${f.quality || ''},"${f.time || ''}","${f.status}","${f.error || ''}"`
    ).join('\n');
    fs.writeFileSync(result.filePath, '\uFEFF' + header + rows, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Watch folder
let activeWatcher = null;

ipcMain.handle('start-watch-folder', async (event, folderPath, settings) => {
  if (activeWatcher) activeWatcher.stop();
  activeWatcher = startWatcher(folderPath, settings, {
    onNewFile: (filePath) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('watch-new-file', filePath);
      }
    },
    onProcessed: (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('watch-processed', data);
      }
    },
    onError: (err) => {
      if (logger) logger.error('Watch folder error', err);
    }
  });
  return { success: true };
});

ipcMain.handle('stop-watch-folder', () => {
  if (activeWatcher) {
    activeWatcher.stop();
    activeWatcher = null;
  }
  return { success: true };
});

// Get thumbnail
ipcMain.handle('get-thumbnail', async (event, filePath) => {
  try {
    const sharp = require('sharp');
    const buf = await sharp(filePath, { failOn: 'none' })
      .resize(80, 80, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toBuffer();
    return { success: true, data: `data:image/jpeg;base64,${buf.toString('base64')}` };
  } catch {
    return { success: false };
  }
});

// Get app info
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    cpuCount: os.cpus().length
  };
});

// Open external URL
ipcMain.handle('open-external', (event, url) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});

// ── Preview ──

ipcMain.handle('generate-preview', async (event, filePath, settings) => {
  try {
    const sharp = require('sharp');

    // Read original image info
    const originalMeta = await sharp(filePath, { failOn: 'none' }).metadata();
    const originalStat = fs.statSync(filePath);

    // Generate original preview (resized for display, max 1200px)
    const originalBuf = await sharp(filePath, { failOn: 'none' })
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Build Sharp pipeline with user settings
    let pipeline = sharp(filePath, { failOn: 'none' });

    // Resize
    if (settings.resizeMode === 'long-edge' && settings.longEdge) {
      pipeline = pipeline.resize(settings.longEdge, settings.longEdge, { fit: 'inside', withoutEnlargement: true });
    } else if (settings.resizeMode === 'custom' && (settings.resizeWidth || settings.resizeHeight)) {
      pipeline = pipeline.resize(settings.resizeWidth || null, settings.resizeHeight || null, {
        fit: settings.maintainAspect ? 'inside' : 'fill',
        withoutEnlargement: true
      });
    } else if (settings.resizeMode === 'crop' && settings.cropWidth && settings.cropHeight) {
      pipeline = pipeline.resize(settings.cropWidth, settings.cropHeight, { fit: 'cover' });
    }

    // Sharpen
    if (settings.sharpen) pipeline = pipeline.sharpen();

    // Strip metadata
    if (settings.stripMetadata) pipeline = pipeline.withMetadata(false);

    // Format
    let convertedBuf;
    const fmt = settings.format || 'webp';
    const quality = settings.quality || 80;

    if (fmt === 'webp') {
      convertedBuf = await pipeline.webp({ quality, lossless: !!settings.lossless }).toBuffer();
    } else if (fmt === 'jpg' || fmt === 'jpeg') {
      convertedBuf = await pipeline.jpeg({ quality }).toBuffer();
    } else if (fmt === 'png') {
      convertedBuf = await pipeline.png({ quality: Math.min(quality, 100) }).toBuffer();
    } else if (fmt === 'avif') {
      convertedBuf = await pipeline.avif({ quality, lossless: !!settings.lossless }).toBuffer();
    } else {
      convertedBuf = await pipeline.webp({ quality }).toBuffer();
    }

    // Get converted image metadata
    const convertedMeta = await sharp(convertedBuf).metadata();

    // Generate display preview of converted (resized for display)
    const convertedDisplayBuf = await sharp(convertedBuf)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      success: true,
      original: `data:image/jpeg;base64,${originalBuf.toString('base64')}`,
      converted: `data:image/jpeg;base64,${convertedDisplayBuf.toString('base64')}`,
      originalInfo: {
        width: originalMeta.width,
        height: originalMeta.height,
        size: originalStat.size,
        format: originalMeta.format
      },
      convertedInfo: {
        width: convertedMeta.width,
        height: convertedMeta.height,
        size: convertedBuf.length,
        format: fmt
      }
    };
  } catch (err) {
    if (logger) logger.error('Preview generation failed', err);
    return { success: false, error: err.message };
  }
});

// ── AI Assistant ──

function getAiConfigPath() {
  return path.join(app.getPath('userData'), 'ai-config.json');
}

function loadAiConfig() {
  const configPath = getAiConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

function ensureAiProvider() {
  const config = loadAiConfig();
  if (!config || !config.apiKey) {
    throw new Error('API key non configurata. Configura il provider AI nelle impostazioni.');
  }
  aiProvider = new AIProvider(config.provider || 'anthropic', config.apiKey);
  return aiProvider;
}

ipcMain.handle('ai-save-config', async (event, config) => {
  try {
    const configPath = getAiConfigPath();
    const existing = loadAiConfig() || {};

    const toSave = {
      provider: config.provider || existing.provider || 'anthropic',
      apiKey: config.apiKey || existing.apiKey
    };

    fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2), 'utf-8');
    aiProvider = null; // Reset so it gets re-created with new config
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai-load-config', async () => {
  try {
    const config = loadAiConfig();
    if (config) {
      return {
        success: true,
        config: {
          provider: config.provider || 'anthropic',
          hasKey: !!config.apiKey
        }
      };
    }
    return { success: true, config: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai-suggest-settings', async (event, description) => {
  try {
    const provider = ensureAiProvider();
    const result = await provider.suggestSettings(description);
    return { success: true, data: result };
  } catch (err) {
    if (logger) logger.error('AI suggest settings failed', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai-generate-alt-text', async (event, filePath) => {
  try {
    const provider = ensureAiProvider();
    const sharp = require('sharp');

    // Resize image for AI (max 512px, low quality to reduce payload)
    const buf = await sharp(filePath, { failOn: 'none' })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    const result = await provider.generateAltText(base64);
    return { success: true, altText: result.altText, altTextEn: result.altTextEn };
  } catch (err) {
    if (logger) logger.error('AI generate alt text failed', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai-generate-metadata', async (event, filePath) => {
  try {
    const provider = ensureAiProvider();
    const sharp = require('sharp');

    // Resize image for AI
    const buf = await sharp(filePath, { failOn: 'none' })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    const result = await provider.generateMetadata(base64);
    return { success: true, metadata: result };
  } catch (err) {
    if (logger) logger.error('AI generate metadata failed', err);
    return { success: false, error: err.message };
  }
});

// ── YouTube Thumbnail Booster ──

ipcMain.handle('thumbnail-boost', async (event, filePath, options) => {
  try {
    const { buffer, info } = await thumbnailBoost(filePath, { ...options, resize: false });
    return {
      success: true,
      preview: `data:image/jpeg;base64,${buffer.toString('base64')}`,
      width: info.width,
      height: info.height,
      size: buffer.length
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('thumbnail-boost-save', async (event, filePath, options, outputDir) => {
  try {
    const { buffer, info } = await thumbnailBoost(filePath, options);
    const baseName = path.parse(path.basename(filePath)).name;
    if (!outputDir) outputDir = path.dirname(filePath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${baseName}-yt-boost.jpg`);
    await fs.promises.writeFile(outputPath, buffer);
    return { success: true, outputPath, size: buffer.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── AI Compression Intelligence ──

ipcMain.handle('ai-analyze-compression', async (event, filePath) => {
  try {
    const provider = ensureAiProvider();
    const sharp = require('sharp');
    const buf = await sharp(filePath, { failOn: 'none' })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    const result = await provider.analyzeForCompression(base64);
    return { success: true, analysis: result };
  } catch (err) {
    if (logger) logger.error('AI analyze compression failed', err);
    return { success: false, error: err.message };
  }
});

// ── AI Smart Crop ──

ipcMain.handle('ai-detect-subject', async (event, filePath) => {
  try {
    const provider = ensureAiProvider();
    const sharp = require('sharp');
    const buf = await sharp(filePath, { failOn: 'none' })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    const result = await provider.detectSubjectRegion(base64);
    return { success: true, region: result };
  } catch (err) {
    if (logger) logger.error('AI detect subject failed', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('smart-crop', async (event, filePath, platformId, region) => {
  try {
    const { buffer, info, crop } = await smartCrop(filePath, platformId, region);
    const sharp = require('sharp');
    const previewBuf = await sharp(buffer)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return {
      success: true,
      preview: `data:image/jpeg;base64,${previewBuf.toString('base64')}`,
      width: info.width,
      height: info.height
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('smart-crop-save', async (event, filePath, platformId, region) => {
  try {
    const { buffer, info } = await smartCrop(filePath, platformId, region);
    const baseName = path.parse(path.basename(filePath)).name;
    const outputDir = path.dirname(filePath);
    const outputPath = path.join(outputDir, `${baseName}-${platformId}.jpg`);
    const sharp = require('sharp');
    const jpgBuf = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    await fs.promises.writeFile(outputPath, jpgBuf);
    return { success: true, outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Multi-Platform Export ──

ipcMain.handle('multi-export', async (event, filePaths, platformIds, outputDir) => {
  try {
    let totalSuccess = 0;
    let totalCount = 0;
    for (const filePath of filePaths) {
      const result = await multiExport(filePath, platformIds, outputDir, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('multi-export-progress', progress);
        }
      });
      totalSuccess += result.success;
      totalCount += result.total;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('multi-export-complete', { success: totalSuccess, total: totalCount });
    }
    return { success: true, data: { success: totalSuccess, total: totalCount } };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Duplicate Detection ──

ipcMain.handle('find-duplicates', async (event, files, threshold) => {
  try {
    const groups = await findDuplicates(files, threshold, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('duplicates-progress', progress);
      }
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('duplicates-result', { groups });
    }
    return { success: true, groups };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Background Replace ──

ipcMain.handle('bg-replace-color', async (event, filePath, options) => {
  try {
    const buffer = await replaceBackgroundByColor(filePath, options);
    const sharp = require('sharp');
    const previewBuf = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return { success: true, preview: `data:image/png;base64,${previewBuf.toString('base64')}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bg-replace-ai-blur', async (event, filePath) => {
  try {
    const provider = ensureAiProvider();
    const sharp = require('sharp');
    const buf = await sharp(filePath, { failOn: 'none' })
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    const region = await provider.detectSubjectRegion(base64);

    const resultBuf = await aiBackgroundBlur(filePath, region);
    const previewBuf = await sharp(resultBuf)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { success: true, preview: `data:image/jpeg;base64,${previewBuf.toString('base64')}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('bg-replace-save', async (event, filePath, options) => {
  try {
    let buffer;
    if (options.mode === 'ai-blur') {
      const provider = ensureAiProvider();
      const sharp = require('sharp');
      const aiBuf = await sharp(filePath, { failOn: 'none' })
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const base64 = `data:image/jpeg;base64,${aiBuf.toString('base64')}`;
      const region = await provider.detectSubjectRegion(base64);
      buffer = await aiBackgroundBlur(filePath, region);
    } else {
      buffer = await replaceBackgroundByColor(filePath, options);
    }
    const baseName = path.parse(path.basename(filePath)).name;
    const outputDir = options.outputDir || path.dirname(filePath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    const ext = options.mode === 'ai-blur' ? '.jpg' : '.png';
    const outputPath = path.join(outputDir, `${baseName}-bg${ext}`);
    await fs.promises.writeFile(outputPath, buffer);
    return { success: true, outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Responsive Web Generator ──

ipcMain.handle('responsive-generate', async (event, filePath, options) => {
  try {
    const manifest = await generateResponsiveSet(filePath, options, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('responsive-progress', progress);
      }
    });
    return { success: true, manifest };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
