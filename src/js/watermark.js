/**
 * Watermark UI controller
 */
const WatermarkUI = {
  init() {
    const chk = document.getElementById('chkWatermark');
    const opts = document.getElementById('watermarkOptions');
    const textOpts = document.getElementById('watermarkTextOpts');
    const imageOpts = document.getElementById('watermarkImageOpts');

    chk.addEventListener('change', () => {
      AppState.settings.watermark.enabled = chk.checked;
      opts.style.display = chk.checked ? '' : 'none';
    });

    // Type toggle
    document.querySelectorAll('input[name="watermarkType"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isText = radio.value === 'text';
        AppState.settings.watermark.type = radio.value;
        textOpts.style.display = isText ? '' : 'none';
        imageOpts.style.display = isText ? 'none' : '';
      });
    });

    // Text options
    document.getElementById('watermarkText').addEventListener('input', (e) => {
      AppState.settings.watermark.text = e.target.value;
    });

    document.getElementById('watermarkFontSize').addEventListener('change', (e) => {
      AppState.settings.watermark.fontSize = parseInt(e.target.value) || 24;
    });

    document.getElementById('watermarkColor').addEventListener('input', (e) => {
      AppState.settings.watermark.color = e.target.value;
    });

    document.getElementById('watermarkStroke').addEventListener('input', (e) => {
      AppState.settings.watermark.stroke = e.target.value;
    });

    // Image
    document.getElementById('btnSelectWatermarkImage').addEventListener('click', async () => {
      const result = await window.api.selectWatermarkImage();
      if (result.success) {
        AppState.settings.watermark.imagePath = result.path;
        document.getElementById('watermarkImagePath').value = result.path;
      }
    });

    // Opacity
    const opacitySlider = document.getElementById('watermarkOpacity');
    const opacityValue = document.getElementById('watermarkOpacityValue');
    opacitySlider.addEventListener('input', () => {
      const val = parseInt(opacitySlider.value);
      AppState.settings.watermark.opacity = val / 100;
      opacityValue.textContent = val + '%';
    });

    // Position
    document.getElementById('watermarkPosition').addEventListener('change', (e) => {
      AppState.settings.watermark.position = e.target.value;
    });

    // Margin
    document.getElementById('watermarkMargin').addEventListener('change', (e) => {
      AppState.settings.watermark.margin = parseInt(e.target.value) || 20;
    });
  }
};
