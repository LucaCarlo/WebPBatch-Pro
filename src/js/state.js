/**
 * Global application state
 */
const AppState = {
  // File list
  files: [],

  // Conversion status
  isConverting: false,
  isPaused: false,

  // Presets
  presets: [],
  currentPresetId: 'web-webp',

  // Settings (synced with UI)
  settings: {
    format: 'webp',
    quality: 80,
    lossless: false,
    resizeMode: 'none',
    longEdge: 1920,
    resizeWidth: null,
    resizeHeight: null,
    cropWidth: null,
    cropHeight: null,
    maintainAspect: true,
    namingTemplate: '{name}',
    outputFolder: null,
    duplicateMode: 'rename',
    stripMetadata: true,
    privacyMode: false,
    keepIcc: false,
    sharpen: false,
    smartMode: false,
    smartMinSaving: 5,
    smartTargetSize: null,
    threads: 'auto',
    includeSubfolders: true,
    watermark: {
      enabled: false,
      type: 'text',
      text: '',
      fontSize: 24,
      color: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
      imagePath: null,
      opacity: 0.5,
      position: 'bottom-right',
      margin: 20
    }
  },

  // Last report
  lastReport: null,
  lastOutputFolder: null,

  // Listeners
  _listeners: {},

  /**
   * Subscribe to state changes
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  /**
   * Emit state change event
   */
  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  },

  /**
   * Update settings from a preset
   */
  applyPreset(preset) {
    if (!preset) return;

    this.settings.format = preset.format || 'webp';
    this.settings.quality = preset.quality || 80;
    this.settings.lossless = preset.lossless || false;
    this.settings.resizeMode = preset.resizeMode || 'none';
    this.settings.longEdge = preset.longEdge || 1920;
    this.settings.maintainAspect = preset.maintainAspect !== false;
    this.settings.sharpen = preset.sharpen || false;
    this.settings.stripMetadata = preset.stripMetadata !== false;
    this.settings.namingTemplate = preset.namingTemplate || '{name}';

    this.currentPresetId = preset.id;
    this.emit('preset-changed', preset);
    this.emit('settings-changed', this.settings);
  },

  /**
   * Get current settings for conversion
   */
  getConversionSettings() {
    const s = { ...this.settings };

    // Only include watermark if enabled and valid
    if (!s.watermark.enabled) {
      s.watermark = null;
    } else {
      s.watermark = { ...s.watermark };
      if (s.watermark.type === 'text' && !s.watermark.text) {
        s.watermark = null;
      }
      if (s.watermark && s.watermark.type === 'image' && !s.watermark.imagePath) {
        s.watermark = null;
      }
    }

    return s;
  },

  /**
   * Add files to the list
   */
  addFiles(newFiles) {
    // Deduplicate by path
    const existingPaths = new Set(this.files.map(f => f.path));
    const unique = newFiles.filter(f => !existingPaths.has(f.path));
    this.files.push(...unique.map(f => ({
      ...f,
      id: Utils.generateId(),
      status: 'queued',
      outputSize: null,
      savedPercent: null,
      error: null,
      thumbnail: null
    })));
    this.emit('files-changed', this.files);
  },

  /**
   * Clear all files
   */
  clearFiles() {
    this.files = [];
    this.emit('files-changed', this.files);
  },

  /**
   * Remove a single file
   */
  removeFile(fileId) {
    this.files = this.files.filter(f => f.id !== fileId);
    this.emit('files-changed', this.files);
  },

  /**
   * Update file status
   */
  updateFileStatus(filePath, data) {
    // Normalize path for Windows compatibility (backslash vs forward slash)
    const norm = p => p.replace(/[\\/]/g, '/');
    const normInput = norm(filePath);
    const file = this.files.find(f => norm(f.path) === normInput);
    if (file) {
      Object.assign(file, data);
      this.emit('file-updated', file);
    }
  },

  /**
   * Reset all file statuses
   */
  resetFileStatuses() {
    this.files.forEach(f => {
      f.status = 'queued';
      f.outputSize = null;
      f.savedPercent = null;
      f.error = null;
    });
    this.emit('files-changed', this.files);
  }
};
