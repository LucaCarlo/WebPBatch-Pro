const sharp = require('sharp');
const path = require('path');

/**
 * Apply watermark to an image buffer.
 * @param {Buffer} imageBuffer - The image to watermark
 * @param {object} imageInfo - { width, height }
 * @param {object} options - watermark options
 * @returns {Promise<Buffer>}
 */
async function applyWatermark(imageBuffer, imageInfo, options) {
  if (!options || (!options.text && !options.imagePath)) {
    return imageBuffer;
  }

  let overlayBuffer;

  if (options.text) {
    overlayBuffer = await createTextWatermark(imageInfo, options);
  } else if (options.imagePath) {
    overlayBuffer = await createImageWatermark(imageInfo, options);
  }

  if (!overlayBuffer) return imageBuffer;

  const position = calculatePosition(imageInfo, options);

  const result = await sharp(imageBuffer)
    .composite([{
      input: overlayBuffer,
      left: position.left,
      top: position.top,
      blend: 'over'
    }])
    .toBuffer();

  return result;
}

async function createTextWatermark(imageInfo, options) {
  const fontSize = options.fontSize || Math.max(16, Math.floor(imageInfo.width * 0.04));
  const color = options.color || '#ffffff';
  const opacity = Math.round((options.opacity || 0.5) * 255);
  const stroke = options.stroke || '#000000';
  const strokeWidth = options.strokeWidth || 1;

  // Convert hex color to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const sr = parseInt(stroke.slice(1, 3), 16);
  const sg = parseInt(stroke.slice(3, 5), 16);
  const sb = parseInt(stroke.slice(5, 7), 16);

  const text = options.text || 'Watermark';

  // Estimate text dimensions
  const estimatedWidth = Math.ceil(text.length * fontSize * 0.6) + 20;
  const estimatedHeight = Math.ceil(fontSize * 1.5) + 10;

  const svg = `
    <svg width="${estimatedWidth}" height="${estimatedHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wm {
          font-family: Arial, Helvetica, sans-serif;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: rgba(${r},${g},${b},${opacity / 255});
          stroke: rgba(${sr},${sg},${sb},${opacity / 255 * 0.8});
          stroke-width: ${strokeWidth}px;
        }
      </style>
      <text x="10" y="${fontSize + 5}" class="wm">${escapeXml(text)}</text>
    </svg>
  `;

  return Buffer.from(svg);
}

async function createImageWatermark(imageInfo, options) {
  const opacity = options.opacity || 0.5;
  // Resize watermark to ~20% of image width
  const maxWidth = Math.floor(imageInfo.width * (options.scale || 0.2));

  let watermark = sharp(options.imagePath).resize({
    width: maxWidth,
    withoutEnlargement: true
  });

  // Apply opacity by using ensureAlpha and modulate
  if (opacity < 1) {
    const buf = await watermark.ensureAlpha().toBuffer();
    // Composite with alpha
    watermark = sharp(buf).ensureAlpha(opacity);
  }

  return await watermark.toBuffer();
}

function calculatePosition(imageInfo, options) {
  const position = options.position || 'bottom-right';
  const margin = options.margin || 20;
  // Estimate overlay size
  const overlayW = options.imagePath ? Math.floor(imageInfo.width * (options.scale || 0.2)) : Math.ceil((options.text || 'Watermark').length * (options.fontSize || 16) * 0.6);
  const overlayH = options.imagePath ? Math.floor(overlayW * 0.5) : Math.ceil((options.fontSize || 16) * 1.5);

  switch (position) {
    case 'top-left':
      return { left: margin, top: margin };
    case 'top-right':
      return { left: Math.max(0, imageInfo.width - overlayW - margin), top: margin };
    case 'top-center':
      return { left: Math.max(0, Math.floor((imageInfo.width - overlayW) / 2)), top: margin };
    case 'center':
      return { left: Math.max(0, Math.floor((imageInfo.width - overlayW) / 2)), top: Math.max(0, Math.floor((imageInfo.height - overlayH) / 2)) };
    case 'bottom-left':
      return { left: margin, top: Math.max(0, imageInfo.height - overlayH - margin) };
    case 'bottom-center':
      return { left: Math.max(0, Math.floor((imageInfo.width - overlayW) / 2)), top: Math.max(0, imageInfo.height - overlayH - margin) };
    case 'bottom-right':
    default:
      return { left: Math.max(0, imageInfo.width - overlayW - margin), top: Math.max(0, imageInfo.height - overlayH - margin) };
  }
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  })[c]);
}

module.exports = { applyWatermark };
