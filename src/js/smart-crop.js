/**
 * AI Smart Crop UI in preview modal
 */
const SmartCrop = {
  currentRegion: null,

  init() {
    const btnDetect = document.getElementById('btnSmartCropDetect');
    const btnSave = document.getElementById('btnSmartCropSave');
    const select = document.getElementById('smartCropPlatform');
    if (!btnDetect || !select) return;

    btnDetect.addEventListener('click', () => this.detectAndCrop());
    if (btnSave) btnSave.addEventListener('click', () => this.saveCrop());
  },

  async detectAndCrop() {
    const file = Preview.currentFile;
    if (!file) return;

    const select = document.getElementById('smartCropPlatform');
    const platform = select.value;
    if (!platform) {
      Utils.showToast('Seleziona una piattaforma', 'warning');
      return;
    }

    const btn = document.getElementById('btnSmartCropDetect');
    btn.disabled = true;
    btn.textContent = 'Rilevando...';

    try {
      // Step 1: Detect subject via AI
      const detectResult = await window.api.aiDetectSubject(file.path);
      if (!detectResult.success) {
        Utils.showToast('Errore: ' + (detectResult.error || 'Impossibile rilevare soggetto'), 'error');
        return;
      }

      this.currentRegion = detectResult.region;

      // Step 2: Smart crop
      const cropResult = await window.api.smartCrop(file.path, platform, detectResult.region);
      if (!cropResult.success) {
        Utils.showToast('Errore crop: ' + (cropResult.error || 'sconosciuto'), 'error');
        return;
      }

      // Show cropped preview
      const preview = document.getElementById('smartCropPreview');
      preview.style.display = '';
      preview.innerHTML = `
        <img src="${cropResult.preview}" alt="Smart Crop" style="max-width:100%;border-radius:6px;margin-top:8px;">
        <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">${cropResult.width}x${cropResult.height} — Soggetto: ${detectResult.region.type || 'rilevato'}</p>
      `;

      document.getElementById('btnSmartCropSave').style.display = '';
      Utils.showToast('Soggetto rilevato, crop applicato', 'success');
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Rileva Soggetto';
    }
  },

  async saveCrop() {
    const file = Preview.currentFile;
    if (!file || !this.currentRegion) return;

    const select = document.getElementById('smartCropPlatform');
    const platform = select.value;
    if (!platform) return;

    try {
      const result = await window.api.smartCropSave(file.path, platform, this.currentRegion);
      if (result.success) {
        Utils.showToast('Crop salvato: ' + result.outputPath.split(/[\\/]/).pop(), 'success');
      } else {
        Utils.showToast('Errore salvataggio: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    }
  }
};
