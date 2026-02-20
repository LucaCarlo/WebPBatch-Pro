/**
 * Drag & Drop handler
 */
const DragDrop = {
  init() {
    const dropZone = document.getElementById('dropZone');
    const btnBrowse = document.getElementById('btnBrowseFiles');
    const btnBrowseFolders = document.getElementById('btnBrowseFolders');

    // Prevent default drag behaviors on the whole window
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      document.body.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight drop zone
    ['dragenter', 'dragover'].forEach(event => {
      dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
    });

    // Handle drop — must re-register with e.preventDefault to allow drop
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleDrop(e.dataTransfer.files);
    });

    // Click on drop zone (not on buttons)
    dropZone.addEventListener('click', (e) => {
      if (e.target.closest('.btn')) return;
      this.browseFiles();
    });

    // Browse buttons
    btnBrowse.addEventListener('click', (e) => {
      e.stopPropagation();
      this.browseFiles();
    });

    btnBrowseFolders.addEventListener('click', (e) => {
      e.stopPropagation();
      this.browseFolders();
    });
  },

  async handleDrop(fileList) {
    const paths = [];

    if (fileList && fileList.length > 0) {
      for (let i = 0; i < fileList.length; i++) {
        try {
          // Electron 29+: use webUtils.getPathForFile() via preload
          const filePath = window.api.getPathForFile(fileList[i]);
          if (filePath) {
            paths.push(filePath);
          }
        } catch {
          // Fallback for older Electron: use File.path
          if (fileList[i].path) {
            paths.push(fileList[i].path);
          }
        }
      }
    }

    if (paths.length === 0) {
      Utils.showToast('Nessun file valido trovato', 'warning');
      return;
    }

    await this.scanPaths(paths);
  },

  async browseFiles() {
    try {
      const result = await window.api.browseFiles();
      if (result.success && result.paths && result.paths.length > 0) {
        await this.scanPaths(result.paths);
      }
    } catch (err) {
      Utils.showToast('Errore nell\'apertura del file browser', 'error');
    }
  },

  async browseFolders() {
    try {
      const result = await window.api.browseFolders();
      if (result.success && result.paths && result.paths.length > 0) {
        await this.scanPaths(result.paths);
      }
    } catch (err) {
      Utils.showToast('Errore nell\'apertura del file browser', 'error');
    }
  },

  async scanPaths(paths) {
    const includeSubfolders = AppState.settings.includeSubfolders;

    Utils.showToast('Scansione in corso...', 'info', 2000);

    try {
      const result = await window.api.scanFiles(paths, includeSubfolders);

      if (result.success && result.files.length > 0) {
        AppState.addFiles(result.files);
        Utils.showToast(`Trovate ${result.files.length} immagini`, 'success');
      } else if (result.success && result.files.length === 0) {
        Utils.showToast('Nessuna immagine supportata trovata', 'warning');
      } else {
        Utils.showToast('Errore nella scansione: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore nella scansione: ' + err.message, 'error');
    }
  }
};
