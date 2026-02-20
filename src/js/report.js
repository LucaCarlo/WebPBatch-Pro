/**
 * Report modal controller
 */
const Report = {
  init() {
    this.modal = document.getElementById('reportModal');
    this.summary = document.getElementById('reportSummary');
    this.details = document.getElementById('reportDetails');

    document.getElementById('closeReportModal').addEventListener('click', () => this.hide());
    document.getElementById('btnOpenOutput').addEventListener('click', () => this.openOutputFolder());
    document.getElementById('btnExportCsv').addEventListener('click', () => this.exportCsv());

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });
  },

  showReport(report) {
    if (!report) return;

    const savedBytes = report.totalInputSize - report.totalOutputSize;
    const savedPercent = report.savedPercent || 0;
    const totalTime = report.totalTime || 0;

    // Summary stats
    this.summary.innerHTML = `
      <div class="report-message">
        Hai risparmiato ${Utils.formatBytes(Math.abs(savedBytes))} (-${savedPercent}%)
      </div>
      <div class="report-stat">
        <div class="report-stat-value">${report.total}</div>
        <div class="report-stat-label">File totali</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value">${report.total - report.errors}</div>
        <div class="report-stat-label">Convertiti</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value success">${Utils.formatBytes(report.totalInputSize)}</div>
        <div class="report-stat-label">Peso originale</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value success">${Utils.formatBytes(report.totalOutputSize)}</div>
        <div class="report-stat-label">Peso finale</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value success">-${savedPercent}%</div>
        <div class="report-stat-label">Risparmio</div>
      </div>
      <div class="report-stat">
        <div class="report-stat-value">${Utils.formatTime(totalTime)}</div>
        <div class="report-stat-label">Tempo totale</div>
      </div>
      ${report.errors > 0 ? `
        <div class="report-stat">
          <div class="report-stat-value" style="color:var(--danger)">${report.errors}</div>
          <div class="report-stat-label">Errori</div>
        </div>
      ` : ''}
    `;

    // Details: list of files with errors
    if (report.errors > 0) {
      const errorFiles = report.files.filter(f => f.status === 'error');
      this.details.innerHTML = `
        <h4 style="margin:12px 0 8px;font-size:13px;">File con errori:</h4>
        <ul style="list-style:none;font-size:12px;">
          ${errorFiles.map(f => `
            <li style="padding:4px 0;color:var(--danger);">
              ${Utils.escapeHtml(f.name)}: ${Utils.escapeHtml(f.error || 'Errore sconosciuto')}
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      this.details.innerHTML = '';
    }

    this.modal.style.display = '';
  },

  hide() {
    this.modal.style.display = 'none';
  },

  async openOutputFolder() {
    if (AppState.lastOutputFolder) {
      await window.api.openFolder(AppState.lastOutputFolder);
    } else {
      Utils.showToast('Cartella output non trovata', 'warning');
    }
  },

  async exportCsv() {
    if (!AppState.lastReport) {
      Utils.showToast('Nessun report disponibile', 'warning');
      return;
    }

    const result = await window.api.exportCsv(AppState.lastReport);
    if (result.success) {
      Utils.showToast('Report CSV esportato', 'success');
    } else {
      Utils.showToast('Errore: ' + (result.error || 'sconosciuto'), 'error');
    }
  }
};
