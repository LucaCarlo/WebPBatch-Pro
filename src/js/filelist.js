/**
 * File list UI
 */
const FileList = {
  thumbnailCache: new Map(),
  container: null,
  tableBody: null,
  wrap: null,
  _thumbQueue: [],
  _thumbLoading: false,
  _sortField: null,
  _sortDir: 'asc',

  init() {
    this.container = document.getElementById('fileListContainer');
    this.tableBody = document.getElementById('fileListBody');
    this.wrap = document.getElementById('fileListWrap');

    // Listen for state changes
    AppState.on('files-changed', () => this.render());
    AppState.on('file-updated', (file) => this.updateRow(file));

    // Clear list
    document.getElementById('btnClearList').addEventListener('click', () => {
      if (AppState.isConverting) return;
      AppState.clearFiles();
    });

    document.getElementById('btnClearAll').addEventListener('click', () => {
      if (AppState.isConverting) return;
      AppState.clearFiles();
    });

    // Sortable column headers
    document.querySelectorAll('.col-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this._sortField === field) {
          this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._sortField = field;
          this._sortDir = 'asc';
        }
        this.updateSortUI();
        this.render();
      });
    });

    // Event delegation for row action buttons (CSP blocks inline onclick)
    this.tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-row-action');
      if (!btn) return;
      const row = btn.closest('tr');
      if (!row) return;
      const fileId = row.dataset.fileId;
      if (!fileId) return;

      const action = btn.dataset.action;
      if (action === 'preview') {
        this.previewFile(fileId);
      } else if (action === 'remove') {
        this.removeFile(fileId);
      }
    });
  },

  updateSortUI() {
    document.querySelectorAll('.col-sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === this._sortField) {
        th.classList.add(this._sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  },

  getSortedFiles() {
    const files = [...AppState.files];
    if (!this._sortField) return files;

    files.sort((a, b) => {
      let valA, valB;
      switch (this._sortField) {
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          return this._sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'size':
          valA = a.size || 0;
          valB = b.size || 0;
          return this._sortDir === 'asc' ? valA - valB : valB - valA;
        default:
          return 0;
      }
    });
    return files;
  },

  render() {
    const files = AppState.files;
    const dropZone = document.getElementById('dropZone');

    if (files.length === 0) {
      this.container.style.display = 'none';
      dropZone.classList.remove('compact');
      document.getElementById('btnConvert').disabled = true;
      return;
    }

    this.container.style.display = '';
    dropZone.classList.add('compact');

    // Update counts
    document.getElementById('fileCount').textContent = files.length;
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    document.getElementById('totalInputSize').textContent = Utils.formatBytes(totalSize);

    // Enable convert button
    document.getElementById('btnConvert').disabled = AppState.isConverting;

    this.renderAllRows();
  },

  renderAllRows() {
    const files = this.getSortedFiles();
    const html = files.map((file) => this.createRowHtml(file)).join('');
    this.tableBody.innerHTML = html;

    // Queue thumbnails for lazy loading
    this._thumbQueue = files.filter(f => !this.thumbnailCache.has(f.path)).map(f => f.path);
    this.processThumbQueue();
  },

  getFileExtension(name) {
    const ext = (name || '').split('.').pop().toLowerCase();
    return ext || '?';
  },

  createRowHtml(file) {
    const statusHtml = this.getStatusBadge(file);
    const resultHtml = this.getResultHtml(file);
    const cached = this.thumbnailCache.get(file.path);
    const thumbHtml = cached
      ? `<img class="file-thumb" src="${cached}" alt="">`
      : `<div class="file-thumb-placeholder" data-fid="${file.id}">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="6" cy="6.5" r="1.5"/><path d="M3 13l3-4 2 2 3-4 3 4"/></svg>
        </div>`;

    const ext = this.getFileExtension(file.name);
    const typeHtml = `<span class="file-type-badge file-type-${ext}">${ext}</span>`;
    const dimsHtml = file.width && file.height
      ? `<span class="file-dims">${file.width}x${file.height}</span>`
      : `<span class="file-dims">-</span>`;

    return `
      <tr data-file-id="${file.id}">
        <td class="col-thumb">${thumbHtml}</td>
        <td class="col-name" title="${Utils.escapeHtml(file.path)}">${Utils.escapeHtml(file.name)}</td>
        <td class="col-type">${typeHtml}</td>
        <td class="col-dims">${dimsHtml}</td>
        <td class="col-size">${Utils.formatBytes(file.size)}</td>
        <td class="col-status">${statusHtml}</td>
        <td class="col-result">${resultHtml}</td>
        <td class="col-actions">
          <div class="file-actions">
            <button class="btn-row-action" data-action="preview" title="Preview">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
            </button>
            <button class="btn-row-action" data-action="remove" title="Rimuovi">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  getStatusBadge(file) {
    switch (file.status) {
      case 'queued':
        return '<span class="status-badge status-queued">In coda</span>';
      case 'processing':
        return '<span class="status-badge status-processing">In corso</span>';
      case 'done':
        return '<span class="status-badge status-done">OK</span>';
      case 'error':
        return `<span class="status-badge status-error" title="${Utils.escapeHtml(file.error || 'Errore sconosciuto')}">Errore</span>`;
      case 'skipped':
        return '<span class="status-badge status-skipped">Saltato</span>';
      default:
        return '<span class="status-badge status-queued">In coda</span>';
    }
  },

  getResultHtml(file) {
    if (file.status === 'done' && file.outputSize != null) {
      const saved = file.savedPercent || 0;
      return `<span class="result-saved">-${saved}%</span> <span class="result-size">${Utils.formatBytes(file.outputSize)}</span>`;
    }
    if (file.status === 'skipped') {
      return '<span class="result-size">Risparmio minimo</span>';
    }
    if (file.status === 'error') {
      return `<span class="result-size" style="color:var(--danger);" title="${Utils.escapeHtml(file.error || '')}">${Utils.escapeHtml((file.error || '').slice(0, 30))}</span>`;
    }
    return '';
  },

  updateRow(file) {
    const row = this.tableBody.querySelector(`tr[data-file-id="${file.id}"]`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    if (cells[5]) cells[5].innerHTML = this.getStatusBadge(file);
    if (cells[6]) cells[6].innerHTML = this.getResultHtml(file);
  },

  previewFile(fileId) {
    const file = AppState.files.find(f => f.id === fileId);
    if (file) Preview.show(file);
  },

  removeFile(fileId) {
    if (AppState.isConverting) return;
    AppState.removeFile(fileId);
  },

  async processThumbQueue() {
    if (this._thumbLoading) return;
    this._thumbLoading = true;

    while (this._thumbQueue.length > 0) {
      const filePath = this._thumbQueue.shift();
      if (this.thumbnailCache.has(filePath)) continue;

      try {
        const result = await window.api.getThumbnail(filePath);
        if (result.success && result.data) {
          this.thumbnailCache.set(filePath, result.data);
          const file = AppState.files.find(f => f.path === filePath);
          if (file) {
            const row = this.tableBody.querySelector(`tr[data-file-id="${file.id}"]`);
            if (row) {
              const ph = row.querySelector('.file-thumb-placeholder');
              if (ph) {
                const img = document.createElement('img');
                img.className = 'file-thumb';
                img.src = result.data;
                img.alt = '';
                ph.replaceWith(img);
              }
            }
          }
        }
      } catch {
        // Ignore thumbnail errors
      }
    }

    this._thumbLoading = false;
  }
};
