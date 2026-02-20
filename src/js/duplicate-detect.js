/**
 * Duplicate & Similar Image Detection UI
 */
const DuplicateDetect = {
  init() {
    const modal = document.getElementById('duplicatesModal');
    const btnOpen = document.getElementById('btnDuplicates');
    const btnClose = document.getElementById('closeDuplicatesModal');
    const btnSearch = document.getElementById('btnSearchDuplicates');

    if (!modal || !btnOpen) return;

    btnOpen.addEventListener('click', () => {
      if (AppState.files.length < 2) {
        Utils.showToast('Servono almeno 2 immagini', 'warning');
        return;
      }
      document.getElementById('duplicatesResults').innerHTML = '';
      document.getElementById('duplicatesProgress').style.display = 'none';
      modal.style.display = '';
    });

    btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    if (btnSearch) btnSearch.addEventListener('click', () => this.search());

    // Listen for progress
    window.api.onDuplicatesProgress((data) => {
      const text = document.getElementById('duplicatesProgressText');
      if (text) {
        text.textContent = `${data.phase === 'hashing' ? 'Analisi' : 'Confronto'}: ${data.current}/${data.total}`;
      }
    });

    window.api.onDuplicatesResult((data) => {
      this.showResults(data.groups);
      document.getElementById('btnSearchDuplicates').disabled = false;
      document.getElementById('btnSearchDuplicates').textContent = 'Cerca Duplicati';
    });
  },

  async search() {
    const threshold = parseInt(document.getElementById('duplicatesThreshold').value) || 5;
    const filePaths = AppState.files.map(f => ({ path: f.path, name: f.name, id: f.id }));

    document.getElementById('duplicatesProgress').style.display = '';
    document.getElementById('duplicatesResults').innerHTML = '';
    const btn = document.getElementById('btnSearchDuplicates');
    btn.disabled = true;
    btn.textContent = 'Analizzando...';

    try {
      const result = await window.api.findDuplicates(filePaths, threshold);
      if (result.success) {
        this.showResults(result.groups);
      } else {
        Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
      }
    } catch (err) {
      Utils.showToast('Errore: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Cerca Duplicati';
    }
  },

  showResults(groups) {
    const container = document.getElementById('duplicatesResults');
    document.getElementById('duplicatesProgress').style.display = 'none';

    if (!groups || groups.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:16px;">Nessun duplicato trovato</p>';
      return;
    }

    container.innerHTML = groups.map((group, gi) => `
      <div class="duplicate-group">
        <div class="duplicate-group-header">
          <strong>Gruppo ${gi + 1}</strong> — ${group.count} immagini simili
          <button class="btn btn-ghost btn-xs duplicate-remove-btn" data-group="${gi}">Rimuovi duplicati</button>
        </div>
        <div class="duplicate-thumbnails">
          ${group.files.map((f, fi) => `
            <div class="duplicate-thumb ${fi === 0 ? 'duplicate-keep' : ''}">
              <span class="duplicate-name" title="${Utils.escapeHtml(f.path)}">${Utils.escapeHtml(f.name)}</span>
              ${fi === 0 ? '<span class="duplicate-badge-keep">Mantieni</span>' : '<span class="duplicate-badge-remove">Rimuovi</span>'}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Event delegation for remove buttons
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.duplicate-remove-btn');
      if (!btn) return;
      const gi = parseInt(btn.dataset.group);
      const group = groups[gi];
      if (!group) return;

      // Remove all except first (keep best)
      group.files.slice(1).forEach(f => {
        AppState.removeFile(f.id);
      });

      btn.closest('.duplicate-group').remove();
      Utils.showToast(`${group.count - 1} duplicati rimossi`, 'success');
    });
  }
};
