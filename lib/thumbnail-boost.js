const sharp = require('sharp');

/**
 * Apply YouTube thumbnail boost to an image.
 * Enhances brightness, saturation, contrast and sharpness.
 * @param {string|Buffer} input - file path or buffer
 * @param {object} options
 * @returns {Promise<{ buffer: Buffer, info: object }>}
 */
async function thumbnailBoost(input, options = {}) {
  const brightness = (options.brightness || 110) / 100;
  const saturation = (options.saturation || 120) / 100;
  const sharpSigma = (options.sharpen || 10) / 10;

  let pipeline = sharp(input, { failOn: 'none' });

  // Step 1: Modulate brightness and saturation
  pipeline = pipeline.modulate({ brightness, saturation });

  // Step 2: Normalize (auto contrast stretch)
  if (options.normalize !== false) {
    pipeline = pipeline.normalize();
  }

  // Step 3: Sharpen
  pipeline = pipeline.sharpen({
    sigma: sharpSigma,
    flat: 1.0,
    jagged: 2.0
  });

  // Step 4: Resize to YouTube thumbnail if requested
  if (options.resize !== false) {
    pipeline = pipeline.resize(1280, 720, { fit: 'cover', position: 'centre' });
  }

  // Output as JPEG quality 90
  const { data, info } = await pipeline.jpeg({ quality: options.quality || 90 }).toBuffer({ resolveWithObject: true });
  return { buffer: data, info };
}

module.exports = { thumbnailBoost };
