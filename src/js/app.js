/**
 * WebPBatch Pro - Main application entry point
 */
(async function App() {
  'use strict';

  // Initialize all modules
  Theme.init();
  DragDrop.init();
  FileList.init();
  Settings.init();
  Presets.init();
  Queue.init();
  Report.init();
  WatermarkUI.init();
  Preview.init();
  AIAssistant.init();

  // Watch Folder modal
  initWatchFolder();

  // Settings toggle
  initSettingsToggle();

  // Shortcuts modal
  initShortcutsModal();

  // About modal
  initAboutModal();

  // File filter
  initFileFilter();

  // Copy log button
  document.getElementById('btnCopyLog').addEventListener('click', async () => {
    const result = await window.api.copyLog();
    if (result.success) {
      Utils.showToast('Log copiato negli appunti', 'success');
    } else {
      Utils.showToast('Errore nel copiare il log', 'error');
    }
  });

  // Load app info
  try {
    const info = await window.api.getAppInfo();
    document.getElementById('appVersion').textContent = `v${info.version}`;
  } catch {
    // ignore
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+O: browse files
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      DragDrop.browseFiles();
    }

    // Ctrl+Enter: start conversion
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!AppState.isConverting && AppState.files.length > 0) {
        Queue.startConversion();
      }
    }

    // Escape: close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => {
        m.style.display = 'none';
      });
    }

    // Ctrl+Shift+Delete: clear list
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Delete') {
      e.preventDefault();
      if (!AppState.isConverting) AppState.clearFiles();
    }

    // Ctrl+D: toggle dark/light theme
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      Theme.set(current === 'dark' ? 'light' : 'dark', true);
    }
  });

  /**
   * Settings Panel toggle
   */
  function initSettingsToggle() {
    const btn = document.getElementById('btnSettings');
    const layout = document.getElementById('mainLayout');
    btn.addEventListener('click', () => {
      layout.classList.toggle('settings-hidden');
    });
  }

  /**
   * Shortcuts modal
   */
  function initShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    const btnOpen = document.getElementById('btnShortcuts');
    const btnClose = document.getElementById('closeShortcutsModal');

    btnOpen.addEventListener('click', () => {
      modal.style.display = '';
    });
    btnClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  /**
   * About modal
   */
  function initAboutModal() {
    const modal = document.getElementById('aboutModal');
    const btnOpen = document.getElementById('btnAbout');
    const btnClose = document.getElementById('closeAboutModal');
    if (!modal || !btnOpen) return;

    btnOpen.addEventListener('click', async () => {
      // Set version
      try {
        const info = await window.api.getAppInfo();
        const verEl = document.getElementById('aboutVersion');
        if (verEl) verEl.textContent = `v${info.version}`;
      } catch { /* ignore */ }
      modal.style.display = '';
    });
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    // GitHub link opens in external browser
    const ghLink = document.getElementById('aboutGithubLink');
    if (ghLink) {
      ghLink.addEventListener('click', (e) => {
        e.preventDefault();
        const url = ghLink.getAttribute('data-url');
        if (url) {
          window.api.openExternal(url);
        }
      });
    }
  }

  /**
   * File filter
   */
  function initFileFilter() {
    const filterInput = document.getElementById('fileFilter');
    if (!filterInput) return;

    filterInput.addEventListener('input', () => {
      const query = filterInput.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#fileListBody tr');
      rows.forEach(row => {
        const nameCell = row.querySelector('.col-name');
        if (!nameCell) return;
        const name = nameCell.textContent.toLowerCase();
        row.style.display = (!query || name.includes(query)) ? '' : 'none';
      });
    });
  }

  /**
   * Watch Folder initialization
   */
  function initWatchFolder() {
    const modal = document.getElementById('watchModal');
    const btnWatch = document.getElementById('btnWatchFolder');
    const btnClose = document.getElementById('closeWatchModal');
    const btnSelectFolder = document.getElementById('btnSelectWatchFolder');
    const btnStart = document.getElementById('btnStartWatch');
    const btnStop = document.getElementById('btnStopWatch');
    const folderInput = document.getElementById('watchFolderPath');
    const watchStatus = document.getElementById('watchStatus');

    let isWatching = false;

    btnWatch.addEventListener('click', () => {
      modal.style.display = '';
    });

    btnClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    btnSelectFolder.addEventListener('click', async () => {
      const result = await window.api.selectOutputFolder();
      if (result.success) {
        folderInput.value = result.path;
      }
    });

    btnStart.addEventListener('click', async () => {
      const folder = folderInput.value;
      if (!folder) {
        Utils.showToast('Seleziona una cartella', 'warning');
        return;
      }

      const settings = AppState.getConversionSettings();
      await window.api.startWatchFolder(folder, settings);
      isWatching = true;
      watchStatus.style.display = '';
      btnStart.style.display = 'none';
      btnStop.style.display = '';
      Utils.showToast('Monitoraggio avviato', 'success');
    });

    btnStop.addEventListener('click', async () => {
      await window.api.stopWatchFolder();
      isWatching = false;
      watchStatus.style.display = 'none';
      btnStart.style.display = '';
      btnStop.style.display = 'none';
      Utils.showToast('Monitoraggio fermato', 'info');
    });

    // Listen for watch events
    window.api.onWatchNewFile((filePath) => {
      Utils.showToast('Nuovo file: ' + filePath.split(/[\\/]/).pop(), 'info', 2000);
    });

    window.api.onWatchProcessed((data) => {
      Utils.showToast(`Convertito: ${data.inputPath.split(/[\\/]/).pop()} (-${data.savedPercent}%)`, 'success');
    });
  }

  // Ready
  console.log('WebPBatch Pro initialized');
})();
