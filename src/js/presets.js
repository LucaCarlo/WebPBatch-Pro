/**
 * Presets UI controller
 */
const Presets = {
  init() {
    this.presetSelect = document.getElementById('presetSelect');
    this.presetActions = document.getElementById('presetActions');

    this.presetSelect.addEventListener('change', () => this.onPresetChange());

    document.getElementById('btnSavePreset').addEventListener('click', () => this.saveCurrentAsPreset());
    document.getElementById('btnDeletePreset').addEventListener('click', () => this.deleteCurrentPreset());
    document.getElementById('btnExportPreset').addEventListener('click', () => this.exportCurrentPreset());
    document.getElementById('btnImportPreset').addEventListener('click', () => this.importPreset());

    this.loadPresets();
  },

  async loadPresets() {
    const presets = await window.api.loadPresets();
    AppState.presets = presets;
    this.rebuildSelect();

    // Apply default preset
    const defaultPreset = presets.find(p => p.id === 'web-webp');
    if (defaultPreset) {
      AppState.applyPreset(defaultPreset);
    }
  },

  rebuildSelect() {
    const select = this.presetSelect;
    // Remember current value
    const currentVal = select.value;

    // Clear
    select.innerHTML = '';

    // Built-in presets
    AppState.presets.filter(p => p._builtin).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });

    // Custom presets
    const customs = AppState.presets.filter(p => !p._builtin);
    if (customs.length > 0) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '──────────';
      select.appendChild(separator);

      customs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    }

    // Custom (free-form)
    const sepEnd = document.createElement('option');
    sepEnd.disabled = true;
    sepEnd.textContent = '──────────';
    select.appendChild(sepEnd);

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Personalizzato';
    select.appendChild(customOpt);

    // Restore value
    if ([...select.options].find(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  },

  onPresetChange() {
    const val = this.presetSelect.value;

    if (val === 'custom') {
      AppState.currentPresetId = 'custom';
      this.presetActions.style.display = '';
      return;
    }

    const preset = AppState.presets.find(p => p.id === val);
    if (preset) {
      AppState.applyPreset(preset);
    }

    // Show actions for custom (non-builtin) presets
    const isCustom = preset && !preset._builtin;
    this.presetActions.style.display = isCustom || val === 'custom' ? '' : 'none';
  },

  async saveCurrentAsPreset() {
    const name = prompt('Nome del preset:', 'Il mio preset');
    if (!name) return;

    const preset = {
      name,
      ...AppState.settings,
      watermark: undefined // Don't save watermark in presets
    };

    const result = await window.api.savePreset(preset);
    if (result.success) {
      AppState.presets.push(result.preset);
      this.rebuildSelect();
      this.presetSelect.value = result.preset.id;
      AppState.currentPresetId = result.preset.id;
      Utils.showToast(`Preset "${name}" salvato`, 'success');
    } else {
      Utils.showToast('Errore nel salvare il preset', 'error');
    }
  },

  async deleteCurrentPreset() {
    const presetId = this.presetSelect.value;
    const preset = AppState.presets.find(p => p.id === presetId);

    if (!preset || preset._builtin) {
      Utils.showToast('Non puoi eliminare un preset di sistema', 'warning');
      return;
    }

    if (!confirm(`Eliminare il preset "${preset.name}"?`)) return;

    const result = await window.api.deletePreset(presetId);
    if (result.success) {
      AppState.presets = AppState.presets.filter(p => p.id !== presetId);
      this.rebuildSelect();
      this.presetSelect.value = 'web-webp';
      this.onPresetChange();
      Utils.showToast('Preset eliminato', 'success');
    }
  },

  async exportCurrentPreset() {
    const presetId = this.presetSelect.value;
    const preset = AppState.presets.find(p => p.id === presetId);
    if (!preset) {
      // Export current settings as preset
      const name = prompt('Nome del preset da esportare:', 'Export');
      if (!name) return;
      const exportPreset = { name, ...AppState.settings };
      const result = await window.api.exportPreset(exportPreset);
      if (result.success) Utils.showToast('Preset esportato', 'success');
      return;
    }

    const result = await window.api.exportPreset(preset);
    if (result.success) Utils.showToast('Preset esportato', 'success');
  },

  async importPreset() {
    const result = await window.api.importPreset();
    if (result.success && result.preset) {
      // Save the imported preset
      const saveResult = await window.api.savePreset(result.preset);
      if (saveResult.success) {
        AppState.presets.push(saveResult.preset);
        this.rebuildSelect();
        this.presetSelect.value = saveResult.preset.id;
        this.onPresetChange();
        Utils.showToast(`Preset "${result.preset.name}" importato`, 'success');
      }
    } else if (result.success === false && result.error) {
      Utils.showToast('Errore: ' + result.error, 'error');
    }
  }
};
