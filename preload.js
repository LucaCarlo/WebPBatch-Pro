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
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});
