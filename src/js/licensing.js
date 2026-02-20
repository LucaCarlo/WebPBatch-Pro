/**
 * License management UI
 */
const Licensing = {
  init() {
    this.modal = document.getElementById('licenseModal');
    this.keyInput = document.getElementById('licenseKeyInput');
    this.errorEl = document.getElementById('licenseError');
    this.activeEl = document.getElementById('licenseActive');

    document.getElementById('btnActivatePro').addEventListener('click', () => this.showModal());
    document.getElementById('closeLicenseModal').addEventListener('click', () => this.hideModal());
    document.getElementById('btnCancelLicense').addEventListener('click', () => this.hideModal());
    document.getElementById('btnConfirmLicense').addEventListener('click', () => this.activate());
    document.getElementById('btnDeactivateLicense').addEventListener('click', () => this.deactivate());

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hideModal();
    });

    // Format key input
    this.keyInput.addEventListener('input', () => this.formatKeyInput());

    // Check license on start
    this.checkLicense();
  },

  async checkLicense() {
    const status = await window.api.getLicenseStatus();
    AppState.isPro = status.isPro;
    AppState.licenseKey = status.key || null;
    this.updateProUI();
  },

  updateProUI() {
    const proLabel = document.getElementById('proLabel');
    const body = document.body;

    if (AppState.isPro) {
      proLabel.textContent = 'Pro Attivo';
      body.classList.remove('pro-locked');
      body.classList.add('pro-active');
    } else {
      proLabel.textContent = 'Attiva Pro';
      body.classList.add('pro-locked');
      body.classList.remove('pro-active');
    }
  },

  showModal() {
    this.errorEl.style.display = 'none';

    if (AppState.isPro) {
      this.keyInput.value = AppState.licenseKey || '';
      this.keyInput.disabled = true;
      this.activeEl.style.display = '';
      document.getElementById('btnConfirmLicense').style.display = 'none';
    } else {
      this.keyInput.value = '';
      this.keyInput.disabled = false;
      this.activeEl.style.display = 'none';
      document.getElementById('btnConfirmLicense').style.display = '';
    }

    this.modal.style.display = '';
    if (!AppState.isPro) this.keyInput.focus();
  },

  hideModal() {
    this.modal.style.display = 'none';
  },

  formatKeyInput() {
    let val = this.keyInput.value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
    if (val.length > 16) val = val.slice(0, 16);

    // Insert dashes
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += '-';
      formatted += val[i];
    }
    this.keyInput.value = formatted;
  },

  async activate() {
    const key = this.keyInput.value.trim();
    if (!key) {
      this.showError('Inserisci una chiave di licenza');
      return;
    }

    const result = await window.api.activateLicense(key);
    if (result.valid) {
      AppState.isPro = true;
      AppState.licenseKey = result.key;
      this.updateProUI();
      this.hideModal();
      Utils.showToast('Licenza Pro attivata con successo!', 'success');
    } else {
      this.showError(result.error || 'Chiave non valida');
    }
  },

  async deactivate() {
    if (!confirm('Disattivare la licenza Pro?')) return;

    await window.api.deactivateLicense();
    AppState.isPro = false;
    AppState.licenseKey = null;
    this.updateProUI();
    this.hideModal();
    Utils.showToast('Licenza disattivata', 'info');
  },

  showError(msg) {
    this.errorEl.textContent = msg;
    this.errorEl.style.display = '';
  }
};
