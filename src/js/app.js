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

  // New feature modules
  if (typeof SafeArea !== 'undefined') SafeArea.init();
  if (typeof SmartCrop !== 'undefined') SmartCrop.init();
  if (typeof MultiExport !== 'undefined') MultiExport.init();
  if (typeof DuplicateDetect !== 'undefined') DuplicateDetect.init();
  if (typeof ResponsiveGen !== 'undefined') ResponsiveGen.init();
  if (typeof WatchFolder !== 'undefined') WatchFolder.init();

  // Preview tools initialization
  initPreviewTools();

  // Watch Folder modal (fallback if WatchFolder module not loaded)
  if (typeof WatchFolder === 'undefined') initWatchFolder();

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

  /**
   * Preview modal tools (Boost, BG Replace, AI Compression, Safe Area, Smart Crop)
   */
  function initPreviewTools() {
    // --- Preview tab switching ---
    document.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        // If AI tab clicked and AI not configured, show toast
        if (target === 'ai' && typeof AIAssistant !== 'undefined' && !AIAssistant.isConfigured) {
          Utils.showToast('Configura l\'Assistente AI nel pannello Impostazioni per usare questa funzione', 'warning');
        }
        // Deactivate all tabs and contents
        document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.preview-tab-content').forEach(c => c.classList.remove('active'));
        // Activate clicked tab and matching content
        tab.classList.add('active');
        const content = document.querySelector(`.preview-tab-content[data-tab-content="${target}"]`);
        if (content) content.classList.add('active');
      });
    });

    // --- Boost sliders live value display ---
    const boostBrightness = document.getElementById('boostBrightness');
    const boostSaturation = document.getElementById('boostSaturation');
    const boostSharpen = document.getElementById('boostSharpen');
    if (boostBrightness) boostBrightness.addEventListener('input', () => { document.getElementById('boostBrightnessVal').textContent = boostBrightness.value; });
    if (boostSaturation) boostSaturation.addEventListener('input', () => { document.getElementById('boostSaturationVal').textContent = boostSaturation.value; });
    if (boostSharpen) boostSharpen.addEventListener('input', () => { document.getElementById('boostSharpenVal').textContent = boostSharpen.value; });

    // --- Boost preview ---
    const btnBoostPreview = document.getElementById('btnBoostPreview');
    if (btnBoostPreview) {
      btnBoostPreview.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        btnBoostPreview.disabled = true;
        btnBoostPreview.textContent = 'Elaborando...';
        try {
          const result = await window.api.thumbnailBoost(file.path, {
            brightness: parseInt(boostBrightness.value),
            saturation: parseInt(boostSaturation.value),
            sharpen: parseInt(boostSharpen.value),
            resize: false
          });
          if (result.success) {
            const previewImg = document.getElementById('previewConverted');
            previewImg.src = 'data:image/jpeg;base64,' + result.data;
            Utils.showToast('Boost applicato in anteprima', 'success');
          }
        } catch (err) {
          Utils.showToast('Errore boost: ' + err.message, 'error');
        } finally {
          btnBoostPreview.disabled = false;
          btnBoostPreview.textContent = 'Anteprima';
        }
      });
    }

    // --- Boost save ---
    const btnBoostSave = document.getElementById('btnBoostSave');
    if (btnBoostSave) {
      btnBoostSave.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        try {
          const result = await window.api.thumbnailBoostSave(file.path, {
            brightness: parseInt(boostBrightness.value),
            saturation: parseInt(boostSaturation.value),
            sharpen: parseInt(boostSharpen.value)
          });
          if (result.success) {
            Utils.showToast('Thumbnail salvato: ' + result.outputPath, 'success');
          } else {
            Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
          }
        } catch (err) {
          Utils.showToast('Errore: ' + err.message, 'error');
        }
      });
    }

    // --- Background Replace mode toggle ---
    const bgMode = document.getElementById('bgReplaceMode');
    const bgColorOpts = document.getElementById('bgReplaceColorOpts');
    if (bgMode) {
      bgMode.addEventListener('change', () => {
        bgColorOpts.style.display = bgMode.value === 'color-remove' ? '' : 'none';
      });
    }

    // --- BG Replacement color toggle ---
    const bgReplacement = document.getElementById('bgReplacement');
    const bgReplacementColor = document.getElementById('bgReplacementColor');
    if (bgReplacement) {
      bgReplacement.addEventListener('change', () => {
        bgReplacementColor.style.display = bgReplacement.value === 'color' ? '' : 'none';
      });
    }

    // --- BG Tolerance display ---
    const bgTolerance = document.getElementById('bgTolerance');
    if (bgTolerance) {
      bgTolerance.addEventListener('input', () => {
        document.getElementById('bgToleranceVal').textContent = bgTolerance.value;
      });
    }

    // --- BG Replace apply ---
    const btnBgReplace = document.getElementById('btnBgReplace');
    if (btnBgReplace) {
      btnBgReplace.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        const mode = bgMode.value;
        if (!mode) { Utils.showToast('Seleziona una modalita', 'warning'); return; }

        btnBgReplace.disabled = true;
        btnBgReplace.textContent = 'Elaborando...';
        try {
          let result;
          if (mode === 'ai-blur') {
            result = await window.api.bgReplaceAiBlur(file.path);
          } else {
            result = await window.api.bgReplaceColor(file.path, {
              targetColor: document.getElementById('bgTargetColor').value,
              tolerance: parseInt(bgTolerance.value),
              replacement: bgReplacement.value,
              replacementColor: bgReplacementColor.value
            });
          }
          if (result.success) {
            const previewImg = document.getElementById('previewConverted');
            previewImg.src = 'data:image/png;base64,' + result.data;
            document.getElementById('btnBgReplaceSave').style.display = '';
            Utils.showToast('Background modificato', 'success');
          } else {
            Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
          }
        } catch (err) {
          Utils.showToast('Errore: ' + err.message, 'error');
        } finally {
          btnBgReplace.disabled = false;
          btnBgReplace.textContent = 'Applica';
        }
      });
    }

    // --- BG Replace save ---
    const btnBgReplaceSave = document.getElementById('btnBgReplaceSave');
    if (btnBgReplaceSave) {
      btnBgReplaceSave.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        const previewImg = document.getElementById('previewConverted');
        const base64 = previewImg.src.replace(/^data:image\/\w+;base64,/, '');
        try {
          const result = await window.api.bgReplaceSave(file.path, base64);
          if (result.success) {
            Utils.showToast('Salvato: ' + result.outputPath, 'success');
          }
        } catch (err) {
          Utils.showToast('Errore: ' + err.message, 'error');
        }
      });
    }

    // --- AI Compression ---
    const btnAiCompression = document.getElementById('btnAiCompression');
    if (btnAiCompression) {
      btnAiCompression.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        btnAiCompression.disabled = true;
        btnAiCompression.textContent = 'Analizzando...';
        try {
          const result = await window.api.aiAnalyzeCompression(file.path);
          if (result.success) {
            const info = document.getElementById('aiCompressionInfo');
            const d = result.data;
            info.innerHTML = `
              <strong>Tipo:</strong> ${d.imageType}<br>
              <strong>Formato:</strong> ${d.format} · <strong>Qualita:</strong> ${d.quality}<br>
              <strong>Sharpen:</strong> ${d.sharpen ? 'Si' : 'No'}<br>
              <strong>Reasoning:</strong> <em>${d.reasoning || ''}</em>
            `;
            document.getElementById('aiCompressionResult').style.display = '';
            // Store for apply
            btnAiCompression._data = d;
          } else {
            Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
          }
        } catch (err) {
          Utils.showToast('Errore AI: ' + err.message, 'error');
        } finally {
          btnAiCompression.disabled = false;
          btnAiCompression.textContent = 'Analizza Immagine';
        }
      });
    }

    // --- Apply AI Compression suggestions ---
    const btnApplyAiCompression = document.getElementById('btnApplyAiCompression');
    if (btnApplyAiCompression) {
      btnApplyAiCompression.addEventListener('click', () => {
        const d = document.getElementById('btnAiCompression')._data;
        if (!d) return;
        // Apply format
        const formatRadio = document.querySelector(`input[name="format"][value="${d.format}"]`);
        if (formatRadio) { formatRadio.checked = true; AppState.settings.format = d.format; }
        // Apply quality
        if (d.quality) {
          AppState.settings.quality = d.quality;
          document.getElementById('qualitySlider').value = d.quality;
          document.getElementById('qualityValue').textContent = d.quality;
        }
        // Apply sharpen
        if (typeof d.sharpen === 'boolean') {
          AppState.settings.sharpen = d.sharpen;
          document.getElementById('chkSharpen').checked = d.sharpen;
        }
        Utils.showToast('Impostazioni AI applicate', 'success');
      });
    }

    // --- Smart Crop ---
    const btnSmartCrop = document.getElementById('btnSmartCrop');
    if (btnSmartCrop) {
      btnSmartCrop.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        const platform = document.getElementById('smartCropPlatform').value;
        btnSmartCrop.disabled = true;
        btnSmartCrop.textContent = 'Rilevando...';
        try {
          // Detect subject
          const detectResult = await window.api.aiDetectSubject(file.path);
          if (!detectResult.success) throw new Error(detectResult.error || 'Rilevamento fallito');

          // Crop
          const cropResult = await window.api.smartCrop(file.path, platform, detectResult.data);
          if (cropResult.success) {
            const container = document.getElementById('smartCropPreview');
            container.innerHTML = `<img src="data:image/jpeg;base64,${cropResult.data}" alt="Crop">`;
            document.getElementById('smartCropResult').style.display = '';
            // Store for save
            btnSmartCrop._cropData = { platform, region: detectResult.data };
            Utils.showToast('Smart Crop completato', 'success');
          } else {
            Utils.showToast('Errore crop: ' + (cropResult.error || ''), 'error');
          }
        } catch (err) {
          Utils.showToast('Errore: ' + err.message, 'error');
        } finally {
          btnSmartCrop.disabled = false;
          btnSmartCrop.textContent = 'Crop AI';
        }
      });
    }

    // --- Smart Crop save ---
    const btnSmartCropSave = document.getElementById('btnSmartCropSave');
    if (btnSmartCropSave) {
      btnSmartCropSave.addEventListener('click', async () => {
        const file = Preview.currentFile;
        if (!file) return;
        const cd = document.getElementById('btnSmartCrop')._cropData;
        if (!cd) return;
        try {
          const result = await window.api.smartCropSave(file.path, cd.platform, cd.region);
          if (result.success) {
            Utils.showToast('Crop salvato: ' + result.outputPath, 'success');
          }
        } catch (err) {
          Utils.showToast('Errore: ' + err.message, 'error');
        }
      });
    }

    // --- Duplicates threshold display ---
    const dupThreshold = document.getElementById('duplicatesThreshold');
    if (dupThreshold) {
      dupThreshold.addEventListener('input', () => {
        document.getElementById('duplicatesThresholdVal').textContent = dupThreshold.value;
      });
    }

    // --- Responsive quality display ---
    const respQuality = document.getElementById('responsiveQuality');
    if (respQuality) {
      respQuality.addEventListener('input', () => {
        document.getElementById('responsiveQualityVal').textContent = respQuality.value;
      });
    }
  }

  // Ready
  console.log('WebPBatch Pro initialized');
})();
