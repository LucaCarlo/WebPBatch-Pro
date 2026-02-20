/**
 * Responsive Web Generator UI
 */
const ResponsiveGen = {
  init() {
    const modal = document.getElementById('responsiveModal');
    const btnOpen = document.getElementById('btnResponsive');
    const btnClose = document.getElementById('closeResponsiveModal');
    const btnGenerate = document.getElementById('btnGenerateResponsive');
    const btnSelectDir = document.getElementById('btnSelectResponsiveDir');

    if (!modal || !btnOpen) return;

    btnOpen.addEventListener('click', () => {
      if (AppState.files.length === 0) {
        Utils.showToast('Carica almeno un\'immagine', 'warning');
        return;
      }
      document.getElementById('responsiveResult').style.display = 'none';
      modal.style.display = '';
    });

    btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    if (btnSelectDir) {
      btnSelectDir.addEventListener('click', async () => {
        const result = await window.api.selectOutputFolder();
        if (result.success) {
          document.getElementById('responsiveOutputDir').value = result.path;
        }
      });
    }

    if (btnGenerate) btnGenerate.addEventListener('click', () => this.generate());

    // Copy HTML snippet
    const btnCopy = document.getElementById('btnCopyResponsiveHtml');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const textarea = document.getElementById('responsiveHtmlSnippet');
        if (textarea && textarea.value) {
          navigator.clipboard.writeText(textarea.value);
          Utils.showToast('HTML copiato', 'success');
        }
      });
    }
  },

  async generate() {
    const file = AppState.files[0]; // Use first file
    if (!file) return;

    // Collect selected sizes
    const sizeCheckboxes = document.querySelectorAll('#responsiveSizes input[type="checkbox"]:checked');
    const sizes = Array.from(sizeCheckboxes).map(cb => parseInt(cb.value));

    // Collect selected formats
    const formatCheckboxes = document.querySelectorAll('#responsiveFormats input[type="checkbox"]:checked');
    const formats = Array.from(formatCheckboxes).map(cb => cb.value);

    if (sizes.length === 0 || formats.length === 0) {
      Utils.showToast('Seleziona almeno un formato e una dimensione', 'warning');
      return;
    }

    const quality = parseInt(document.getElementById('responsiveQuality').value) || 80;
    let outputDir = document.getElementById('responsiveOutputDir').value;
    if (!outputDir) {
      const dir = file.path.replace(/[\\/][^\\/]+$/, '');
      outputDir = dir + '/responsive';
    }

    const btn = document.getElementById('btnGenerateResponsive');
    btn.disabled = true;
    btn.textContent = 'Generando...';

    try {
      const result = await window.api.responsiveGenerate(file.path, { sizes, formats, quality, outputDir });
      if (result.success) {
        this.showResult(result.manifest);
        Utils.showToast('Responsive set generato', 'success');
      } else {
        Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Genera Set Responsive';
    }
  },

  showResult(manifest) {
    const container = document.getElementById('responsiveResult');
    container.style.display = '';

    // Show HTML snippet
    document.getElementById('responsiveHtmlSnippet').value = manifest.html;

    // Show file list
    const filesHtml = manifest.images.map(img =>
      `<div class="responsive-file-item">${img.fileName} <small style="color:var(--text-muted)">${img.width}w · ${Utils.formatBytes(img.size)}</small></div>`
    ).join('');

    document.getElementById('responsiveFileList').innerHTML = filesHtml;

    // Show placeholder
    if (manifest.placeholder) {
      document.getElementById('responsivePlaceholder').innerHTML =
        `<img src="${manifest.placeholder}" alt="Placeholder" style="width:60px;border-radius:4px;image-rendering:pixelated;">`;
    }
  }
};
