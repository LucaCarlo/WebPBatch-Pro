/**
 * Utility helpers
 */
const Utils = {
  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  },

  /**
   * Format milliseconds to human-readable time
   */
  formatTime(ms) {
    if (ms < 1000) return ms + 'ms';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  },

  /**
   * Show a toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Debounce a function
   */
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Generate a simple ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /**
   * Escape HTML
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Show/hide element
   */
  show(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.style.display = '';
  },

  hide(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.style.display = 'none';
  },

  /**
   * Query selector shortcuts
   */
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return document.querySelectorAll(selector);
  }
};
