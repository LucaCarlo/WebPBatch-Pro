const sharp = require('sharp');

/**
 * Replace background by color matching.
 * @param {string|Buffer} input
 * @param {object} options - { targetColor, tolerance, replacement }
 * @returns {Promise<Buffer>}
 */
async function replaceBackgroundByColor(input, options) {
  const img = sharp(input, { failOn: 'none' }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const target = hexToRgb(options.targetColor || '#ffffff');
  const tolerance = options.tolerance || 30;

  // Set alpha to 0 for matching background pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt(
      Math.pow(r - target.r, 2) +
      Math.pow(g - target.g, 2) +
      Math.pow(b - target.b, 2)
    );
    if (dist <= tolerance) {
      data[i + 3] = 0; // transparent
    }
  }

  const subjectBuffer = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  const replacement = options.replacement || 'transparent';

  if (replacement === 'transparent') {
    return subjectBuffer;
  }

  if (replacement === 'blur') {
    const blurred = await sharp(input, { failOn: 'none' }).blur(20).ensureAlpha().toBuffer();
    return sharp(blurred)
      .composite([{ input: subjectBuffer, blend: 'over' }])
      .png()
      .toBuffer();
  }

  if (replacement.startsWith('#')) {
    const bg = hexToRgb(replacement);
    const bgBuffer = await sharp({
      create: { width: info.width, height: info.height, channels: 4, background: { r: bg.r, g: bg.g, b: bg.b, alpha: 255 } }
    }).png().toBuffer();
    return sharp(bgBuffer)
      .composite([{ input: subjectBuffer, blend: 'over' }])
      .png()
      .toBuffer();
  }

  return subjectBuffer;
}

/**
 * AI-assisted background blur using subject region.
 * @param {string|Buffer} input
 * @param {object} subjectRegion - { x, y, w, h } percentages
 * @returns {Promise<Buffer>}
 */
async function aiBackgroundBlur(input, subjectRegion) {
  const metadata = await sharp(input, { failOn: 'none' }).metadata();
  const sx = Math.floor(metadata.width * subjectRegion.x / 100);
  const sy = Math.floor(metadata.height * subjectRegion.y / 100);
  const sw = Math.max(1, Math.floor(metadata.width * subjectRegion.w / 100));
  const sh = Math.max(1, Math.floor(metadata.height * subjectRegion.h / 100));

  // Clamp to image bounds
  const safeLeft = Math.min(sx, metadata.width - 1);
  const safeTop = Math.min(sy, metadata.height - 1);
  const safeWidth = Math.min(sw, metadata.width - safeLeft);
  const safeHeight = Math.min(sh, metadata.height - safeTop);

  // Extract subject
  const subject = await sharp(input, { failOn: 'none' })
    .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
    .toBuffer();

  // Blur full image
  const blurred = await sharp(input, { failOn: 'none' })
    .blur(15)
    .toBuffer();

  // Composite subject back onto blurred background
  return sharp(blurred)
    .composite([{ input: subject, left: safeLeft, top: safeTop, blend: 'over' }])
    .toBuffer();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

module.exports = { replaceBackgroundByColor, aiBackgroundBlur };
