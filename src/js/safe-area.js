/**
 * Safe Area Overlay for social media platforms (pure frontend)
 */
const SafeArea = {
  overlays: {
    'tiktok': [
      { label: 'Caption', top: '85%', left: '0', width: '100%', height: '15%', color: 'rgba(255,0,0,0.2)' },
      { label: 'UI Top', top: '0', left: '0', width: '100%', height: '10%', color: 'rgba(255,165,0,0.15)' }
    ],
    'instagram': [
      { label: 'Header', top: '0', left: '0', width: '100%', height: '8%', color: 'rgba(255,0,0,0.2)' },
      { label: 'Caption', top: '92%', left: '0', width: '100%', height: '8%', color: 'rgba(255,0,0,0.2)' }
    ],
    'youtube': [
      { label: 'Timestamp', top: '85%', left: '75%', width: '25%', height: '15%', color: 'rgba(255,0,0,0.25)' },
      { label: 'Logo', top: '0', left: '0', width: '15%', height: '12%', color: 'rgba(255,165,0,0.15)' }
    ],
    'facebook': [
      { label: 'Overlay UI', top: '90%', left: '0', width: '100%', height: '10%', color: 'rgba(255,0,0,0.2)' }
    ]
  },

  init() {
    const select = document.getElementById('safeAreaPlatform');
    if (!select) return;

    select.addEventListener('change', () => {
      const platform = select.value;
      if (platform) {
        this.show(platform);
      } else {
        this.clear();
      }
    });
  },

  show(platform) {
    this.clear();
    const zones = this.overlays[platform];
    if (!zones) return;

    const container = document.querySelector('.preview-images');
    if (!container) return;

    zones.forEach(zone => {
      const el = document.createElement('div');
      el.className = 'safe-area-zone';
      el.style.cssText = `position:absolute;top:${zone.top};left:${zone.left};width:${zone.width};height:${zone.height};background:${zone.color};z-index:8;pointer-events:none;display:flex;align-items:center;justify-content:center;`;
      el.innerHTML = `<span class="safe-area-label">${zone.label}</span>`;
      container.appendChild(el);
    });
  },

  clear() {
    document.querySelectorAll('.safe-area-zone').forEach(el => el.remove());
  }
};
