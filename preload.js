const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // File path from dropped File object (Electron 29+ requirement)
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // Scan
  scanFiles: (paths, includeSubfolders) => ipcRenderer.invoke('scan-files', paths, includeSubfolders),

  // Conversion
  startConversion: (fileList, settings) => ipcRenderer.invoke('start-conversion', fileList, settings),
  pauseConversion: () => ipcRenderer.invoke('pause-conversion'),
  resumeConversion: () => ipcRenderer.invoke('resume-conversion'),
  cancelConversion: () => ipcRenderer.invoke('cancel-conversion'),

  // Events from main
  onConversionProgress: (cb) => ipcRenderer.on('conversion-progress', (e, data) => cb(data)),
  onConversionFileComplete: (cb) => ipcRenderer.on('conversion-file-complete', (e, data) => cb(data)),
  onConversionFileError: (cb) => ipcRenderer.on('conversion-file-error', (e, data) => cb(data)),
  onConversionComplete: (cb) => ipcRenderer.on('conversion-complete', (e, data) => cb(data)),
  onWatchNewFile: (cb) => ipcRenderer.on('watch-new-file', (e, data) => cb(data)),
  onWatchProcessed: (cb) => ipcRenderer.on('watch-processed', (e, data) => cb(data)),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Dialogs
  browseFiles: () => ipcRenderer.invoke('browse-files'),
  browseFolders: () => ipcRenderer.invoke('browse-folders'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  selectWatermarkImage: () => ipcRenderer.invoke('select-watermark-image'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // Presets
  loadPresets: () => ipcRenderer.invoke('load-presets'),
  savePreset: (preset) => ipcRenderer.invoke('save-preset', preset),
  deletePreset: (id) => ipcRenderer.invoke('delete-preset', id),
  exportPreset: (preset) => ipcRenderer.invoke('export-preset', preset),
  importPreset: () => ipcRenderer.invoke('import-preset'),

  // Logging
  copyLog: () => ipcRenderer.invoke('copy-log'),
  exportCsv: (reportData) => ipcRenderer.invoke('export-csv', reportData),

  // Watch folder
  startWatchFolder: (folderPath, settings) => ipcRenderer.invoke('start-watch-folder', folderPath, settings),
  stopWatchFolder: () => ipcRenderer.invoke('stop-watch-folder'),

  // Thumbnail
  getThumbnail: (filePath) => ipcRenderer.invoke('get-thumbnail', filePath),

  // Preview
  generatePreview: (filePath, settings) => ipcRenderer.invoke('generate-preview', filePath, settings),

  // AI Assistant
  aiSuggestSettings: (description) => ipcRenderer.invoke('ai-suggest-settings', description),
  aiGenerateAltText: (filePath) => ipcRenderer.invoke('ai-generate-alt-text', filePath),
  aiGenerateMetadata: (filePath) => ipcRenderer.invoke('ai-generate-metadata', filePath),
  aiSaveConfig: (config) => ipcRenderer.invoke('ai-save-config', config),
  aiLoadConfig: () => ipcRenderer.invoke('ai-load-config'),

  // Open external URL
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // ── YouTube Thumbnail Booster ──
  thumbnailBoost: (filePath, options) => ipcRenderer.invoke('thumbnail-boost', filePath, options),
  thumbnailBoostSave: (filePath, options, outputDir) => ipcRenderer.invoke('thumbnail-boost-save', filePath, options, outputDir),

  // ── AI Compression Intelligence ──
  aiAnalyzeCompression: (filePath) => ipcRenderer.invoke('ai-analyze-compression', filePath),

  // ── AI Smart Crop ──
  aiDetectSubject: (filePath) => ipcRenderer.invoke('ai-detect-subject', filePath),
  smartCrop: (filePath, platformId, region) => ipcRenderer.invoke('smart-crop', filePath, platformId, region),
  smartCropSave: (filePath, platformId, region) => ipcRenderer.invoke('smart-crop-save', filePath, platformId, region),

  // ── Multi-Platform Export ──
  multiExport: (filePaths, platformIds, outputDir) => ipcRenderer.invoke('multi-export', filePaths, platformIds, outputDir),
  onMultiExportProgress: (cb) => ipcRenderer.on('multi-export-progress', (e, data) => cb(data)),
  onMultiExportComplete: (cb) => ipcRenderer.on('multi-export-complete', (e, data) => cb(data)),

  // ── Duplicate Detection ──
  findDuplicates: (files, threshold) => ipcRenderer.invoke('find-duplicates', files, threshold),
  onDuplicatesProgress: (cb) => ipcRenderer.on('duplicates-progress', (e, data) => cb(data)),
  onDuplicatesResult: (cb) => ipcRenderer.on('duplicates-result', (e, data) => cb(data)),

  // ── Background Replace ──
  bgReplaceColor: (filePath, options) => ipcRenderer.invoke('bg-replace-color', filePath, options),
  bgReplaceAiBlur: (filePath) => ipcRenderer.invoke('bg-replace-ai-blur', filePath),
  bgReplaceSave: (filePath, options) => ipcRenderer.invoke('bg-replace-save', filePath, options),

  // ── Responsive Web Generator ──
  responsiveGenerate: (filePath, options) => ipcRenderer.invoke('responsive-generate', filePath, options),
  onResponsiveProgress: (cb) => ipcRenderer.on('responsive-progress', (e, data) => cb(data)),
  onResponsiveComplete: (cb) => ipcRenderer.on('responsive-complete', (e, data) => cb(data))
});
