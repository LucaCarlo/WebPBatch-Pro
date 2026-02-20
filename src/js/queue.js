/**
 * Queue & conversion controller
 */
const Queue = {
  init() {
    this.btnConvert = document.getElementById('btnConvert');
    this.btnPause = document.getElementById('btnPause');
    this.btnResume = document.getElementById('btnResume');
    this.btnCancel = document.getElementById('btnCancel');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    this.btnConvert.addEventListener('click', () => this.startConversion());
    this.btnPause.addEventListener('click', () => this.pause());
    this.btnResume.addEventListener('click', () => this.resume());
    this.btnCancel.addEventListener('click', () => this.cancel());

    // IPC events from main process
    window.api.onConversionProgress((data) => this.onProgress(data));
    window.api.onConversionFileComplete((data) => this.onFileComplete(data));
    window.api.onConversionFileError((data) => this.onFileError(data));
    window.api.onConversionComplete((report) => this.onComplete(report));
  },

  async startConversion() {
    if (AppState.files.length === 0) {
      Utils.showToast('Nessun file da convertire', 'warning');
      return;
    }

    // Reset statuses
    AppState.resetFileStatuses();

    // Set converting state
    AppState.isConverting = true;
    AppState.isPaused = false;
    this.updateUI();

    // Prepare file list for main process
    const fileList = AppState.files.map(f => ({
      path: f.path,
      name: f.name,
      size: f.size,
      dir: f.dir || f.path.substring(0, Math.max(f.path.lastIndexOf('\\'), f.path.lastIndexOf('/')))
    }));

    // Get settings
    const settings = AppState.getConversionSettings();

    // Store output folder for report
    if (settings.outputFolder) {
      AppState.lastOutputFolder = settings.outputFolder;
    } else if (fileList.length > 0) {
      // Default: optimized/ in first file's directory
      const sep = fileList[0].path.includes('\\') ? '\\' : '/';
      AppState.lastOutputFolder = fileList[0].dir + sep + 'optimized';
    }

    const result = await window.api.startConversion(fileList, settings);

    if (!result.success) {
      AppState.isConverting = false;
      this.updateUI();
      Utils.showToast('Errore: ' + result.error, 'error');
    }
  },

  onProgress(data) {
    this.progressFill.style.width = data.percent + '%';
    this.progressText.textContent = `${data.processed}/${data.total} (${data.percent}%)`;

    if (data.errors > 0) {
      this.progressText.textContent += ` - ${data.errors} errori`;
    }
  },

  onFileComplete(data) {
    AppState.updateFileStatus(data.inputPath, {
      status: data.status === 'skipped' ? 'skipped' : 'done',
      outputSize: data.outputSize,
      savedPercent: data.savedPercent,
      outputPath: data.outputPath
    });
  },

  onFileError(data) {
    AppState.updateFileStatus(data.inputPath, {
      status: 'error',
      error: data.error
    });
  },

  onComplete(report) {
    AppState.isConverting = false;
    AppState.isPaused = false;
    AppState.lastReport = report;
    this.updateUI();
    this.progressFill.style.width = '100%';
    this.progressText.textContent = 'Completato';

    // Show report
    Report.showReport(report);
  },

  async pause() {
    await window.api.pauseConversion();
    AppState.isPaused = true;
    this.updateUI();
    this.progressText.textContent += ' (In pausa)';
  },

  async resume() {
    await window.api.resumeConversion();
    AppState.isPaused = false;
    this.updateUI();
  },

  async cancel() {
    if (!confirm('Annullare la conversione? I file già convertiti rimarranno.')) return;
    await window.api.cancelConversion();
    AppState.isConverting = false;
    AppState.isPaused = false;
    this.updateUI();
    this.progressText.textContent = 'Annullato';
    Utils.showToast('Conversione annullata', 'warning');
  },

  updateUI() {
    const converting = AppState.isConverting;
    const paused = AppState.isPaused;

    this.btnConvert.style.display = converting ? 'none' : '';
    this.btnConvert.disabled = AppState.files.length === 0;
    this.btnPause.style.display = converting && !paused ? '' : 'none';
    this.btnResume.style.display = converting && paused ? '' : 'none';
    this.btnCancel.style.display = converting ? '' : 'none';

    if (!converting) {
      this.progressFill.style.width = '0%';
      this.progressText.textContent = 'Pronto';
    }

    // Disable file removal during conversion
    document.getElementById('btnClearList').disabled = converting;
    document.getElementById('btnClearAll').disabled = converting;
  },

  reset() {
    this.progressFill.style.width = '0%';
    this.progressText.textContent = 'Pronto';
    AppState.isConverting = false;
    AppState.isPaused = false;
    this.updateUI();
  }
};
