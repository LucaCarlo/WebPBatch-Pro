/**
 * Enhanced Watch Folder UI
 */
const WatchFolder = {
  isWatching: false,
  processedCount: 0,

  init() {
    const modal = document.getElementById('watchModal');
    const btnWatch = document.getElementById('btnWatchFolder');
    const btnClose = document.getElementById('closeWatchModal');
    const btnSelectFolder = document.getElementById('btnSelectWatchFolder');
    const btnStart = document.getElementById('btnStartWatch');
    const btnStop = document.getElementById('btnStopWatch');

    if (!modal || !btnWatch) return;

    btnWatch.addEventListener('click', () => { modal.style.display = ''; });
    btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    btnSelectFolder.addEventListener('click', async () => {
      const result = await window.api.selectOutputFolder();
      if (result.success) {
        document.getElementById('watchFolderPath').value = result.path;
      }
    });

    btnStart.addEventListener('click', () => this.start());
    btnStop.addEventListener('click', () => this.stop());

    // Events
    window.api.onWatchNewFile((filePath) => {
      Utils.showToast('Nuovo file: ' + filePath.split(/[\\/]/).pop(), 'info', 2000);
      this.addActivityLog(filePath.split(/[\\/]/).pop(), 'In elaborazione...', '-');
    });

    window.api.onWatchProcessed((data) => {
      this.processedCount++;
      this.updateCounter();
      this.addActivityLog(
        data.inputPath.split(/[\\/]/).pop(),
        'OK',
        `-${data.savedPercent}%`
      );
      Utils.showToast(`Convertito: ${data.inputPath.split(/[\\/]/).pop()} (-${data.savedPercent}%)`, 'success');
    });
  },

  async start() {
    const folder = document.getElementById('watchFolderPath').value;
    if (!folder) {
      Utils.showToast('Seleziona una cartella', 'warning');
      return;
    }

    const settings = AppState.getConversionSettings();
    await window.api.startWatchFolder(folder, settings);
    this.isWatching = true;
    this.processedCount = 0;
    this.updateCounter();

    document.getElementById('watchStatus').style.display = '';
    document.getElementById('watchActivityLog').style.display = '';
    document.getElementById('btnStartWatch').style.display = 'none';
    document.getElementById('btnStopWatch').style.display = '';
    Utils.showToast('Monitoraggio avviato', 'success');
  },

  async stop() {
    await window.api.stopWatchFolder();
    this.isWatching = false;
    document.getElementById('watchStatus').style.display = 'none';
    document.getElementById('btnStartWatch').style.display = '';
    document.getElementById('btnStopWatch').style.display = 'none';
    Utils.showToast('Monitoraggio fermato', 'info');
  },

  updateCounter() {
    const counter = document.getElementById('watchCounter');
    if (counter) counter.textContent = this.processedCount + ' file processati';
  },

  addActivityLog(fileName, status, saving) {
    const tbody = document.getElementById('watchLogBody');
    if (!tbody) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const row = document.createElement('tr');
    row.innerHTML = `<td>${time}</td><td>${Utils.escapeHtml(fileName)}</td><td>${status}</td><td>${saving}</td>`;
    tbody.insertBefore(row, tbody.firstChild);

    // Keep max 50 rows
    while (tbody.children.length > 50) {
      tbody.removeChild(tbody.lastChild);
    }
  }
};
