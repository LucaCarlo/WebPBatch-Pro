/**
 * Settings panel controller
 */
const Settings = {
  init() {
    this.bindFormatRadios();
    this.bindQualitySlider();
    this.bindResizeMode();
    this.bindOutputFolder();
    this.bindNaming();
    this.bindDuplicateMode();
    this.bindMetadata();
    this.bindAdvanced();
    this.bindSubfolders();

    // Listen for preset changes to update UI
    AppState.on('preset-changed', (preset) => this.syncUIFromState());
    AppState.on('settings-changed', () => this.syncUIFromState());
  },

  /**
   * Sync UI controls from current state
   */
  syncUIFromState() {
    const s = AppState.settings;

    // Format
    document.querySelectorAll('input[name="format"]').forEach(r => {
      r.checked = r.value === s.format;
    });

    // Quality
    document.getElementById('qualitySlider').value = s.quality;
    document.getElementById('qualityValue').textContent = s.quality;
    this.updateQualityGroupVisibility();

    // Lossless
    document.getElementById('chkLossless').checked = s.lossless;

    // Resize
    document.getElementById('resizeMode').value = s.resizeMode;
    this.toggleResizeOptions(s.resizeMode);
    if (s.resizeMode === 'long-edge') {
      const longEdgeSelect = document.getElementById('longEdgeValue');
      const options = [...longEdgeSelect.options].map(o => o.value);
      if (options.includes(String(s.longEdge))) {
        longEdgeSelect.value = String(s.longEdge);
      } else {
        longEdgeSelect.value = 'custom';
        document.getElementById('longEdgeCustom').value = s.longEdge;
        document.getElementById('longEdgeCustom').style.display = '';
      }
    }

    // Naming
    document.getElementById('namingTemplate').value = s.namingTemplate;

    // Output folder
    document.getElementById('outputFolder').value = s.outputFolder || '';

    // Duplicate
    document.getElementById('duplicateMode').value = s.duplicateMode;

    // Metadata
    document.getElementById('chkStripMetadata').checked = s.stripMetadata;
    document.getElementById('chkPrivacyMode').checked = s.privacyMode;
    document.getElementById('chkKeepIcc').checked = s.keepIcc;

    // Sharpen
    document.getElementById('chkSharpen').checked = s.sharpen;

    // Smart mode
    document.getElementById('chkSmartMode').checked = s.smartMode;
    document.getElementById('smartOptions').style.display = s.smartMode ? '' : 'none';
    document.getElementById('smartMinSaving').value = s.smartMinSaving;
    document.getElementById('smartTargetSize').value = s.smartTargetSize || '';

    // Threads
    document.getElementById('threadCount').value = s.threads;

    // Aspect ratio
    document.getElementById('chkMaintainAspect').checked = s.maintainAspect;

    // Preset selector
    const presetSelect = document.getElementById('presetSelect');
    const options = [...presetSelect.options].map(o => o.value);
    if (options.includes(AppState.currentPresetId)) {
      presetSelect.value = AppState.currentPresetId;
    } else {
      presetSelect.value = 'custom';
    }
  },

  bindFormatRadios() {
    document.querySelectorAll('input[name="format"]').forEach(radio => {
      radio.addEventListener('change', () => {
        AppState.settings.format = radio.value;
        this.switchToCustomPreset();
        this.updateQualityGroupVisibility();
      });
    });
  },

  updateQualityGroupVisibility() {
    const fmt = AppState.settings.format;
    const isLossless = AppState.settings.lossless;
    const qualityGroup = document.getElementById('qualityGroup');

    // PNG is always lossless (unless quantize), hide quality for lossless
    if (fmt === 'png' && !AppState.settings.pngQuantize) {
      qualityGroup.style.opacity = '0.4';
    } else if (isLossless && fmt === 'webp') {
      qualityGroup.style.opacity = '0.4';
    } else {
      qualityGroup.style.opacity = '1';
    }
  },

  bindQualitySlider() {
    const slider = document.getElementById('qualitySlider');
    const value = document.getElementById('qualityValue');

    slider.addEventListener('input', () => {
      value.textContent = slider.value;
      AppState.settings.quality = parseInt(slider.value);
      this.switchToCustomPreset();
    });
  },

  bindResizeMode() {
    const select = document.getElementById('resizeMode');
    const longEdgeSelect = document.getElementById('longEdgeValue');
    const longEdgeCustom = document.getElementById('longEdgeCustom');

    select.addEventListener('change', () => {
      AppState.settings.resizeMode = select.value;
      this.toggleResizeOptions(select.value);
      this.switchToCustomPreset();
    });

    longEdgeSelect.addEventListener('change', () => {
      if (longEdgeSelect.value === 'custom') {
        longEdgeCustom.style.display = '';
        longEdgeCustom.focus();
      } else {
        longEdgeCustom.style.display = 'none';
        AppState.settings.longEdge = parseInt(longEdgeSelect.value);
        this.switchToCustomPreset();
      }
    });

    longEdgeCustom.addEventListener('change', () => {
      AppState.settings.longEdge = parseInt(longEdgeCustom.value) || 1920;
      this.switchToCustomPreset();
    });

    // Custom resize inputs
    document.getElementById('resizeWidth').addEventListener('change', (e) => {
      AppState.settings.resizeWidth = parseInt(e.target.value) || null;
      this.switchToCustomPreset();
    });

    document.getElementById('resizeHeight').addEventListener('change', (e) => {
      AppState.settings.resizeHeight = parseInt(e.target.value) || null;
      this.switchToCustomPreset();
    });

    document.getElementById('chkMaintainAspect').addEventListener('change', (e) => {
      AppState.settings.maintainAspect = e.target.checked;
    });

    // Crop inputs
    const cropW = document.getElementById('cropWidth');
    const cropH = document.getElementById('cropHeight');
    if (cropW) {
      cropW.addEventListener('change', (e) => {
        AppState.settings.cropWidth = parseInt(e.target.value) || null;
        this.switchToCustomPreset();
      });
    }
    if (cropH) {
      cropH.addEventListener('change', (e) => {
        AppState.settings.cropHeight = parseInt(e.target.value) || null;
        this.switchToCustomPreset();
      });
    }
  },

  toggleResizeOptions(mode) {
    document.getElementById('resizeLongEdge').style.display = mode === 'long-edge' ? '' : 'none';
    document.getElementById('resizeCustom').style.display = mode === 'custom' ? '' : 'none';
    const cropDiv = document.getElementById('resizeCrop');
    if (cropDiv) cropDiv.style.display = mode === 'crop' ? '' : 'none';
  },

  bindOutputFolder() {
    document.getElementById('btnSelectOutput').addEventListener('click', async () => {
      const result = await window.api.selectOutputFolder();
      if (result.success) {
        AppState.settings.outputFolder = result.path;
        document.getElementById('outputFolder').value = result.path;
      }
    });

    document.getElementById('btnResetOutput').addEventListener('click', () => {
      AppState.settings.outputFolder = null;
      document.getElementById('outputFolder').value = '';
    });
  },

  bindNaming() {
    const input = document.getElementById('namingTemplate');
    input.addEventListener('change', () => {
      AppState.settings.namingTemplate = input.value || '{name}';
      this.switchToCustomPreset();
    });

    // Variable buttons
    document.querySelectorAll('.naming-vars .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const varStr = btn.dataset.var;
        const input = document.getElementById('namingTemplate');
        const pos = input.selectionStart || input.value.length;
        input.value = input.value.slice(0, pos) + varStr + input.value.slice(pos);
        AppState.settings.namingTemplate = input.value;
        input.focus();
        this.switchToCustomPreset();
      });
    });
  },

  bindDuplicateMode() {
    document.getElementById('duplicateMode').addEventListener('change', (e) => {
      AppState.settings.duplicateMode = e.target.value;
    });
  },

  bindMetadata() {
    document.getElementById('chkStripMetadata').addEventListener('change', (e) => {
      AppState.settings.stripMetadata = e.target.checked;
    });
    document.getElementById('chkPrivacyMode').addEventListener('change', (e) => {
      AppState.settings.privacyMode = e.target.checked;
    });
    document.getElementById('chkKeepIcc').addEventListener('change', (e) => {
      AppState.settings.keepIcc = e.target.checked;
    });
  },

  bindAdvanced() {
    // Lossless
    document.getElementById('chkLossless').addEventListener('change', (e) => {
      AppState.settings.lossless = e.target.checked;
      this.updateQualityGroupVisibility();
      this.switchToCustomPreset();
    });

    // Sharpen
    document.getElementById('chkSharpen').addEventListener('change', (e) => {
      AppState.settings.sharpen = e.target.checked;
    });

    // Smart mode
    document.getElementById('chkSmartMode').addEventListener('change', (e) => {
      AppState.settings.smartMode = e.target.checked;
      document.getElementById('smartOptions').style.display = e.target.checked ? '' : 'none';
    });

    document.getElementById('smartMinSaving').addEventListener('change', (e) => {
      AppState.settings.smartMinSaving = parseInt(e.target.value) || 5;
    });

    document.getElementById('smartTargetSize').addEventListener('change', (e) => {
      AppState.settings.smartTargetSize = parseInt(e.target.value) || null;
    });

    // Threads
    document.getElementById('threadCount').addEventListener('change', (e) => {
      AppState.settings.threads = e.target.value;
    });
  },

  bindSubfolders() {
    document.getElementById('chkSubfolders').addEventListener('change', (e) => {
      AppState.settings.includeSubfolders = e.target.checked;
    });
  },

  switchToCustomPreset() {
    const presetSelect = document.getElementById('presetSelect');
    // Only switch to custom if we're not already on custom and user changed something
    if (AppState.currentPresetId !== 'custom') {
      AppState.currentPresetId = 'custom';
      presetSelect.value = 'custom';
    }
  }
};
