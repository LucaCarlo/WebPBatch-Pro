const sharp = require('sharp');
const path = require('path');

/**
 * Apply watermark to an image buffer.
 * Supports: fixed, random, pattern, and subtle modes.
 */
async function applyWatermark(imageBuffer, imageInfo, options) {
  if (!options || (!options.text && !options.imagePath)) {
    return imageBuffer;
  }

  const positionMode = options.positionMode || 'fixed';

  // Pattern mode: tile watermark across image
  if (positionMode === 'pattern' || positionMode === 'subtle') {
    return applyPatternWatermark(imageBuffer, imageInfo, options);
  }

  let overlayBuffer;
  if (options.text) {
    overlayBuffer = await createTextWatermark(imageInfo, options);
  } else if (options.imagePath) {
    overlayBuffer = await createImageWatermark(imageInfo, options);
  }

  if (!overlayBuffer) return imageBuffer;

  let position;
  if (positionMode === 'random') {
    position = calculateRandomPosition(imageInfo, options);
  } else {
    position = calculatePosition(imageInfo, options);
  }

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

/**
 * Pattern watermark: tiles the watermark across the image
 */
async function applyPatternWatermark(imageBuffer, imageInfo, options) {
  const isSubtle = options.positionMode === 'subtle';
  const effectiveOpacity = isSubtle ? Math.min(options.opacity || 0.1, 0.15) : (options.opacity || 0.5);
  const gap = options.patternGap || 100;
  const rotation = options.patternRotation || -30;

  // Create single watermark overlay
  const wmOptions = { ...options, opacity: effectiveOpacity };
  let singleOverlay;
  if (options.text) {
    singleOverlay = await createTextWatermark(imageInfo, wmOptions);
  } else if (options.imagePath) {
    singleOverlay = await createImageWatermark(imageInfo, wmOptions);
  }
  if (!singleOverlay) return imageBuffer;

  // Get overlay dimensions
  const overlayMeta = await sharp(singleOverlay).metadata();
  const oW = overlayMeta.width || 100;
  const oH = overlayMeta.height || 30;

  // Rotate overlay if needed
  let rotatedOverlay = singleOverlay;
  if (rotation !== 0) {
    rotatedOverlay = await sharp(singleOverlay)
      .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
  }

  const rotatedMeta = await sharp(rotatedOverlay).metadata();
  const rW = rotatedMeta.width;
  const rH = rotatedMeta.height;

  // Calculate grid positions
  const composites = [];
  const stepX = rW + gap;
  const stepY = rH + gap;

  for (let y = -rH; y < imageInfo.height + rH; y += stepY) {
    for (let x = -rW; x < imageInfo.width + rW; x += stepX) {
      const left = Math.max(0, Math.round(x));
      const top = Math.max(0, Math.round(y));
      if (left < imageInfo.width && top < imageInfo.height) {
        composites.push({ input: rotatedOverlay, left, top, blend: 'over' });
      }
    }
  }

  if (composites.length === 0) return imageBuffer;

  // Limit composites to prevent memory issues
  const maxComposites = 200;
  const limited = composites.slice(0, maxComposites);

  return sharp(imageBuffer).composite(limited).toBuffer();
}

async function createTextWatermark(imageInfo, options) {
  // Adaptive sizing
  let fontSize;
  if (options.sizeMode === 'adaptive') {
    const percent = (options.adaptivePercent || 4) / 100;
    fontSize = Math.max(12, Math.floor(imageInfo.width * percent));
  } else {
    fontSize = options.fontSize || Math.max(16, Math.floor(imageInfo.width * 0.04));
  }

  const color = options.color || '#ffffff';
  const opacity = Math.round((options.opacity || 0.5) * 255);
  const stroke = options.stroke || '#000000';
  const strokeWidth = options.strokeWidth || 1;

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const sr = parseInt(stroke.slice(1, 3), 16);
  const sg = parseInt(stroke.slice(3, 5), 16);
  const sb = parseInt(stroke.slice(5, 7), 16);

  const text = options.text || 'Watermark';
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
  let maxWidth;
  if (options.sizeMode === 'adaptive') {
    const percent = (options.adaptivePercent || 4) / 100;
    maxWidth = Math.floor(imageInfo.width * percent * 5);
  } else {
    maxWidth = Math.floor(imageInfo.width * (options.scale || 0.2));
  }

  let watermark = sharp(options.imagePath).resize({
    width: maxWidth,
    withoutEnlargement: true
  });

  if (opacity < 1) {
    const buf = await watermark.ensureAlpha().toBuffer();
    watermark = sharp(buf).ensureAlpha(opacity);
  }

  return await watermark.toBuffer();
}

function calculatePosition(imageInfo, options) {
  const position = options.position || 'bottom-right';
  const margin = options.margin || 20;
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

function calculateRandomPosition(imageInfo, options) {
  const margin = Math.floor(Math.max(imageInfo.width, imageInfo.height) * 0.1);
  const overlayW = options.imagePath ? Math.floor(imageInfo.width * (options.scale || 0.2)) : Math.ceil((options.text || 'Watermark').length * (options.fontSize || 16) * 0.6);
  const overlayH = options.imagePath ? Math.floor(overlayW * 0.5) : Math.ceil((options.fontSize || 16) * 1.5);

  const maxLeft = Math.max(margin, imageInfo.width - overlayW - margin);
  const maxTop = Math.max(margin, imageInfo.height - overlayH - margin);

  return {
    left: margin + Math.floor(Math.random() * (maxLeft - margin)),
    top: margin + Math.floor(Math.random() * (maxTop - margin))
  };
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  })[c]);
}

module.exports = { applyWatermark };
