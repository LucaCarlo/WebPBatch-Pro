/**
 * Side-by-side image preview with comparison slider
 */
const Preview = {
  modal: null,
  slider: null,
  isDragging: false,
  currentFile: null,

  init() {
    this.modal = document.getElementById('previewModal');
    this.slider = document.getElementById('previewSlider');
    this.originalImg = document.getElementById('previewOriginal');
    this.convertedImg = document.getElementById('previewConverted');
    this.compareContainer = document.getElementById('previewCompare');
    this.infoOriginal = document.getElementById('previewInfoOriginal');
    this.infoConverted = document.getElementById('previewInfoConverted');
    this.infoSavings = document.getElementById('previewInfoSavings');
    this.loading = document.getElementById('previewLoading');
    this.altTextArea = document.getElementById('previewAltText');
    this.metadataArea = document.getElementById('previewMetadata');

    // Close
    document.getElementById('closePreviewModal').addEventListener('click', () => this.hide());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });

    // Slider drag
    this.slider.addEventListener('mousedown', (e) => this.startDrag(e));
    this.slider.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
    document.addEventListener('mouseup', () => this.stopDrag());
    document.addEventListener('touchend', () => this.stopDrag());

    // AI buttons
    const btnAltText = document.getElementById('btnGenerateAltText');
    const btnMetadata = document.getElementById('btnGenerateMetadata');
    if (btnAltText) {
      btnAltText.addEventListener('click', () => this.generateAltText());
    }
    if (btnMetadata) {
      btnMetadata.addEventListener('click', () => this.generateMetadata());
    }

    // Copy alt text
    const btnCopyAlt = document.getElementById('btnCopyAltText');
    if (btnCopyAlt) {
      btnCopyAlt.addEventListener('click', () => {
        if (this.altTextArea.value) {
          navigator.clipboard.writeText(this.altTextArea.value);
          Utils.showToast('Alt text copiato', 'success');
        }
      });
    }

    // Copy metadata
    const btnCopyMeta = document.getElementById('btnCopyMetadata');
    if (btnCopyMeta) {
      btnCopyMeta.addEventListener('click', () => {
        if (this.metadataArea.value) {
          navigator.clipboard.writeText(this.metadataArea.value);
          Utils.showToast('Metadata copiato', 'success');
        }
      });
    }
  },

  async show(file) {
    this.currentFile = file;
    this.modal.style.display = '';
    this.loading.style.display = '';
    this.compareContainer.style.display = 'none';
    this.altTextArea.value = '';
    this.metadataArea.value = '';

    // Reset slider position to middle
    this.setSliderPosition(50);

    try {
      const settings = AppState.getConversionSettings();
      const result = await window.api.generatePreview(file.path, settings);

      if (result.success) {
        this.originalImg.src = result.original;
        this.convertedImg.src = result.converted;

        // Info
        this.infoOriginal.innerHTML = `
          <strong>Originale</strong><br>
          ${result.originalInfo.width} × ${result.originalInfo.height}<br>
          ${Utils.formatBytes(result.originalInfo.size)}
        `;
        this.infoConverted.innerHTML = `
          <strong>Convertita (${settings.format.toUpperCase()})</strong><br>
          ${result.convertedInfo.width} × ${result.convertedInfo.height}<br>
          ${Utils.formatBytes(result.convertedInfo.size)}
        `;

        const savedPercent = Math.round(((result.originalInfo.size - result.convertedInfo.size) / result.originalInfo.size) * 100);
        const savedBytes = result.originalInfo.size - result.convertedInfo.size;
        this.infoSavings.innerHTML = `
          <span class="preview-savings-value ${savedPercent > 0 ? 'positive' : 'negative'}">
            ${savedPercent > 0 ? '-' : '+'}${Math.abs(savedPercent)}%
          </span>
          <span class="preview-savings-label">
            ${savedPercent > 0 ? 'Risparmiati' : 'Aumento'} ${Utils.formatBytes(Math.abs(savedBytes))}
          </span>
        `;

        this.loading.style.display = 'none';
        this.compareContainer.style.display = '';
      } else {
        this.loading.innerHTML = '<p style="color:var(--danger)">Errore nella preview: ' + (result.error || 'sconosciuto') + '</p>';
      }
    } catch (err) {
      this.loading.innerHTML = '<p style="color:var(--danger)">Errore: ' + err.message + '</p>';
    }
  },

  hide() {
    this.modal.style.display = 'none';
    this.currentFile = null;
    // Clear images to free memory
    this.originalImg.src = '';
    this.convertedImg.src = '';
  },

  setSliderPosition(percent) {
    percent = Math.max(0, Math.min(100, percent));
    this.slider.style.left = percent + '%';
    this.convertedImg.style.clipPath = `inset(0 0 0 ${percent}%)`;
    this.originalImg.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
  },

  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    this.slider.classList.add('dragging');
  },

  onDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    const rect = this.compareContainer.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const percent = (x / rect.width) * 100;
    this.setSliderPosition(percent);
  },

  stopDrag() {
    this.isDragging = false;
    this.slider.classList.remove('dragging');
  },

  async generateAltText() {
    if (!this.currentFile) return;

    const btnAltText = document.getElementById('btnGenerateAltText');
    btnAltText.disabled = true;
    btnAltText.textContent = 'Generando...';

    try {
      const result = await window.api.aiGenerateAltText(this.currentFile.path);
      if (result.success) {
        this.altTextArea.value = result.altText;
        Utils.showToast('Alt text generato', 'success');
      } else {
        Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    } finally {
      btnAltText.disabled = false;
      btnAltText.textContent = 'Genera Alt Text';
    }
  },

  async generateMetadata() {
    if (!this.currentFile) return;

    const btnMetadata = document.getElementById('btnGenerateMetadata');
    btnMetadata.disabled = true;
    btnMetadata.textContent = 'Generando...';

    try {
      const result = await window.api.aiGenerateMetadata(this.currentFile.path);
      if (result.success) {
        this.metadataArea.value = JSON.stringify(result.metadata, null, 2);
        Utils.showToast('Metadata SEO generato', 'success');
      } else {
        Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    } finally {
      btnMetadata.disabled = false;
      btnMetadata.textContent = 'Genera Metadata SEO';
    }
  }
};
