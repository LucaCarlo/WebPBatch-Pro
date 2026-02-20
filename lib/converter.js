const sharp = require('sharp');
const path = require('path');

/**
 * Convert a single image file.
 * @param {string} inputPath
 * @param {object} options
 * @returns {Promise<{buffer: Buffer, info: object, inputMetadata: object}>}
 */
async function convertImage(inputPath, options) {
  let pipeline = sharp(inputPath, { failOn: 'none', animated: false });

  // Get metadata first for resize calculations
  const metadata = await sharp(inputPath, { failOn: 'none', animated: false }).metadata();

  // Resize
  if (options.resize && options.resize !== 'none') {
    const resizeOpts = { withoutEnlargement: true };

    if (options.resize === 'long-edge' && options.longEdge) {
      const longEdge = parseInt(options.longEdge);
      if (metadata.width >= metadata.height) {
        resizeOpts.width = longEdge;
      } else {
        resizeOpts.height = longEdge;
      }
      resizeOpts.fit = 'inside';
    } else if (options.resize === 'custom') {
      if (options.maintainAspect !== false) {
        if (options.width) resizeOpts.width = parseInt(options.width);
        if (options.height) resizeOpts.height = parseInt(options.height);
        resizeOpts.fit = 'inside';
      } else {
        if (options.width) resizeOpts.width = parseInt(options.width);
        if (options.height) resizeOpts.height = parseInt(options.height);
        resizeOpts.fit = 'fill';
      }
    } else if (options.resize === 'crop' && options.width && options.height) {
      resizeOpts.width = parseInt(options.width);
      resizeOpts.height = parseInt(options.height);
      resizeOpts.fit = 'cover';
      resizeOpts.position = 'centre';
    }

    if (resizeOpts.width || resizeOpts.height) {
      pipeline = pipeline.resize(resizeOpts);
    }
  }

  // Sharpen after resize (optional)
  if (options.sharpen) {
    pipeline = pipeline.sharpen({ sigma: 0.5 });
  }

  // Metadata handling
  if (options.stripMetadata !== false) {
    // Sharp strips metadata by default when not calling withMetadata
  } else if (options.privacyMode) {
    pipeline = pipeline.withMetadata({ orientation: metadata.orientation });
  } else {
    pipeline = pipeline.withMetadata();
  }

  // Format conversion
  const quality = parseInt(options.quality) || 80;
  const format = (options.format || 'webp').toLowerCase();

  switch (format) {
    case 'webp':
      if (options.lossless) {
        pipeline = pipeline.webp({ lossless: true });
      } else {
        pipeline = pipeline.webp({ quality, effort: 4 });
      }
      break;
    case 'jpg':
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      if (options.pngQuantize) {
        pipeline = pipeline.png({ quality, effort: 7, palette: true });
      } else {
        pipeline = pipeline.png({ effort: 7 });
      }
      break;
    case 'avif':
      if (options.lossless) {
        pipeline = pipeline.avif({ lossless: true });
      } else {
        pipeline = pipeline.avif({ quality, effort: 4 });
      }
      break;
    default:
      pipeline = pipeline.webp({ quality });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    info: {
      width: info.width,
      height: info.height,
      size: info.size,
      format: info.format
    },
    inputMetadata: {
      width: metadata.width,
      height: metadata.height
    }
  };
}

module.exports = { convertImage };
