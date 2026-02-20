/**
 * AI Assistant UI controller
 */
const AIAssistant = {
  init() {
    // AI Settings inputs
    this.providerSelect = document.getElementById('aiProvider');
    this.apiKeyInput = document.getElementById('aiApiKey');
    this.btnSaveAiConfig = document.getElementById('btnSaveAiConfig');
    this.aiStatus = document.getElementById('aiStatus');

    // Suggest settings
    this.descriptionInput = document.getElementById('aiDescription');
    this.btnSuggest = document.getElementById('btnAiSuggest');
    this.suggestResult = document.getElementById('aiSuggestResult');

    // Events
    if (this.btnSaveAiConfig) {
      this.btnSaveAiConfig.addEventListener('click', () => this.saveConfig());
    }
    if (this.btnSuggest) {
      this.btnSuggest.addEventListener('click', () => this.suggestSettings());
    }

    // Load saved config
    this.loadConfig();
  },

  async loadConfig() {
    try {
      const config = await window.api.aiLoadConfig();
      if (config.success && config.config) {
        if (this.providerSelect) this.providerSelect.value = config.config.provider || 'anthropic';
        if (this.apiKeyInput && config.config.hasKey) {
          this.apiKeyInput.placeholder = 'Chiave salvata (inserisci per cambiare)';
        }
        this.updateStatus(config.config.hasKey);
      }
    } catch {
      // Ignore
    }
  },

  async saveConfig() {
    const provider = this.providerSelect.value;
    const apiKey = this.apiKeyInput.value.trim();

    if (!apiKey && !this.apiKeyInput.placeholder.includes('salvata')) {
      Utils.showToast('Inserisci una API key', 'warning');
      return;
    }

    try {
      const result = await window.api.aiSaveConfig({
        provider,
        apiKey: apiKey || undefined // Don't overwrite if empty
      });

      if (result.success) {
        this.apiKeyInput.value = '';
        this.apiKeyInput.placeholder = 'Chiave salvata (inserisci per cambiare)';
        this.updateStatus(true);
        Utils.showToast('Configurazione AI salvata', 'success');
      } else {
        Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    }
  },

  updateStatus(configured) {
    if (!this.aiStatus) return;
    if (configured) {
      this.aiStatus.innerHTML = '<span class="ai-status-ok">AI Configurata</span>';
    } else {
      this.aiStatus.innerHTML = '<span class="ai-status-missing">API key non configurata</span>';
    }
  },

  async suggestSettings() {
    const description = this.descriptionInput.value.trim();
    if (!description) {
      Utils.showToast('Descrivi il tuo caso d\'uso', 'warning');
      this.descriptionInput.focus();
      return;
    }

    this.btnSuggest.disabled = true;
    this.btnSuggest.textContent = 'Analizzando...';
    this.suggestResult.innerHTML = '<p class="ai-loading">L\'AI sta analizzando...</p>';
    this.suggestResult.style.display = '';

    try {
      const result = await window.api.aiSuggestSettings(description);

      if (result.success && result.data) {
        this.showSuggestions(result.data);
      } else {
        this.suggestResult.innerHTML = `<p class="ai-error">Errore: ${result.error || 'Risposta non valida'}</p>`;
      }
    } catch (err) {
      this.suggestResult.innerHTML = `<p class="ai-error">Errore: ${err.message}</p>`;
    } finally {
      this.btnSuggest.disabled = false;
      this.btnSuggest.textContent = 'Suggerisci Impostazioni';
    }
  },

  showSuggestions(data) {
    const settings = data.settings;
    const reasoning = data.reasoning || '';
    const tips = data.tips || [];

    let html = `
      <div class="ai-suggestion">
        <p class="ai-reasoning">${Utils.escapeHtml(reasoning)}</p>
        <div class="ai-settings-preview">
          <div class="ai-setting-item"><strong>Formato:</strong> ${(settings.format || 'webp').toUpperCase()}</div>
          <div class="ai-setting-item"><strong>Qualita':</strong> ${settings.quality || 80}%</div>
          <div class="ai-setting-item"><strong>Resize:</strong> ${settings.resizeMode === 'long-edge' ? settings.longEdge + 'px lato lungo' : settings.resizeMode === 'custom' ? (settings.resizeWidth || '?') + '×' + (settings.resizeHeight || '?') : 'Nessuno'}</div>
          ${settings.sharpen ? '<div class="ai-setting-item"><strong>Sharpen:</strong> Si</div>' : ''}
          ${settings.lossless ? '<div class="ai-setting-item"><strong>Lossless:</strong> Si</div>' : ''}
        </div>
    `;

    if (tips.length > 0) {
      html += '<div class="ai-tips"><strong>Consigli:</strong><ul>';
      tips.forEach(tip => {
        html += `<li>${Utils.escapeHtml(tip)}</li>`;
      });
      html += '</ul></div>';
    }

    html += `
        <button class="btn btn-accent btn-sm" id="btnApplyAiSettings">Applica Impostazioni</button>
      </div>
    `;

    this.suggestResult.innerHTML = html;
    this.suggestResult.style.display = '';

    // Apply button
    document.getElementById('btnApplyAiSettings').addEventListener('click', () => {
      this.applySettings(settings);
    });
  },

  applySettings(settings) {
    if (settings.format) AppState.settings.format = settings.format;
    if (settings.quality) AppState.settings.quality = settings.quality;
    if (settings.resizeMode) AppState.settings.resizeMode = settings.resizeMode;
    if (settings.longEdge) AppState.settings.longEdge = settings.longEdge;
    if (settings.resizeWidth !== undefined) AppState.settings.resizeWidth = settings.resizeWidth;
    if (settings.resizeHeight !== undefined) AppState.settings.resizeHeight = settings.resizeHeight;
    if (settings.sharpen !== undefined) AppState.settings.sharpen = settings.sharpen;
    if (settings.stripMetadata !== undefined) AppState.settings.stripMetadata = settings.stripMetadata;
    if (settings.lossless !== undefined) AppState.settings.lossless = settings.lossless;

    AppState.currentPresetId = 'custom';
    AppState.emit('settings-changed', AppState.settings);
    Settings.syncUIFromState();

    Utils.showToast('Impostazioni AI applicate', 'success');
  }
};
