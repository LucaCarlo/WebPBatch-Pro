/**
 * Theme toggle (dark/light mode)
 */
const Theme = {
  init() {
    this.btnToggle = document.getElementById('btnThemeToggle');
    this.iconSun = this.btnToggle.querySelector('.icon-sun');
    this.iconMoon = this.btnToggle.querySelector('.icon-moon');

    // Load saved theme or detect system preference
    const saved = localStorage.getItem('webpbatch-theme');
    if (saved) {
      this.set(saved, false);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.set('dark', false);
    } else {
      this.set('light', false);
    }

    // Toggle button
    this.btnToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      this.set(current === 'dark' ? 'light' : 'dark', true);
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('webpbatch-theme')) {
          this.set(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  },

  set(theme, save) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
      localStorage.setItem('webpbatch-theme', theme);
    }
    this.updateIcon(theme);
  },

  updateIcon(theme) {
    if (!this.iconSun || !this.iconMoon) return;
    if (theme === 'dark') {
      this.iconSun.style.display = '';
      this.iconMoon.style.display = 'none';
    } else {
      this.iconSun.style.display = 'none';
      this.iconMoon.style.display = '';
    }
  }
};
