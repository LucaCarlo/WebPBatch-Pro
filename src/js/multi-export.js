/**
 * Multi-Platform Auto Export UI
 */
const MultiExport = {
  platforms: [
    { id: 'instagram-post', name: 'Instagram Post', dims: '1080x1350' },
    { id: 'instagram-story', name: 'Instagram Story', dims: '1080x1920' },
    { id: 'tiktok', name: 'TikTok', dims: '1080x1920' },
    { id: 'youtube-thumb', name: 'YouTube Thumbnail', dims: '1280x720' },
    { id: 'pinterest', name: 'Pinterest', dims: '1000x1500' },
    { id: 'web-webp', name: 'Web WebP', dims: '1920px' }
  ],

  init() {
    const modal = document.getElementById('multiExportModal');
    const btnOpen = document.getElementById('btnMultiExport');
    const btnClose = document.getElementById('closeMultiExportModal');
    const btnStart = document.getElementById('btnStartMultiExport');
    const btnSelectDir = document.getElementById('btnSelectMultiExportDir');

    if (!modal || !btnOpen) return;

    btnOpen.addEventListener('click', () => {
      if (AppState.files.length === 0) {
        Utils.showToast('Carica almeno un\'immagine', 'warning');
        return;
      }
      this.renderPlatforms();
      modal.style.display = '';
    });

    btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    btnSelectDir.addEventListener('click', async () => {
      const result = await window.api.selectOutputFolder();
      if (result.success) {
        document.getElementById('multiExportOutputDir').value = result.path;
      }
    });

    btnStart.addEventListener('click', () => this.startExport());

    // Listen for progress
    window.api.onMultiExportProgress((data) => {
      const progress = document.getElementById('multiExportProgressBar');
      const text = document.getElementById('multiExportProgressText');
      if (progress && text) {
        const pct = Math.round((data.current / data.total) * 100);
        progress.style.width = pct + '%';
        text.textContent = `${data.platform} - ${data.status === 'done' ? 'OK' : data.status}`;
      }
    });

    window.api.onMultiExportComplete((data) => {
      document.getElementById('btnStartMultiExport').disabled = false;
      document.getElementById('btnStartMultiExport').textContent = 'Esporta per tutte le piattaforme';
      Utils.showToast(`Export completato: ${data.success}/${data.total} piattaforme`, 'success');
    });
  },

  renderPlatforms() {
    const container = document.getElementById('multiExportPlatforms');
    container.innerHTML = this.platforms.map(p => `
      <label class="checkbox-label multi-export-platform">
        <input type="checkbox" value="${p.id}" checked>
        <span>${p.name} <small style="color:var(--text-muted)">(${p.dims})</small></span>
      </label>
    `).join('');
  },

  async startExport() {
    const checkboxes = document.querySelectorAll('#multiExportPlatforms input[type="checkbox"]:checked');
    const platformIds = Array.from(checkboxes).map(cb => cb.value);
    if (platformIds.length === 0) {
      Utils.showToast('Seleziona almeno una piattaforma', 'warning');
      return;
    }

    let outputDir = document.getElementById('multiExportOutputDir').value;
    if (!outputDir) {
      // Use first file's directory + 'multi-export'
      const firstFile = AppState.files[0];
      if (firstFile) {
        const dir = firstFile.path.replace(/[\\/][^\\/]+$/, '');
        outputDir = dir + '/multi-export';
      } else {
        Utils.showToast('Seleziona cartella output', 'warning');
        return;
      }
    }

    const filePaths = AppState.files.map(f => f.path);

    // Show progress
    const progressWrap = document.getElementById('multiExportProgress');
    progressWrap.style.display = '';

    const btn = document.getElementById('btnStartMultiExport');
    btn.disabled = true;
    btn.textContent = 'Esportando...';

    try {
      const result = await window.api.multiExport(filePaths, platformIds, outputDir);
      if (result.success) {
        Utils.showToast(`Export completato: ${result.data.success}/${result.data.total} OK`, 'success');
      } else {
        Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Esporta per tutte le piattaforme';
    }
  }
};
