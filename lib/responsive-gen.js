const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DEFAULT_SIZES = [320, 640, 768, 1024, 1280, 1920];
const DEFAULT_FORMATS = ['webp', 'avif', 'jpg'];

/**
 * Generate responsive image set from a single image.
 * @param {string} inputPath
 * @param {object} options
 * @param {function} onProgress
 * @returns {Promise<object>} manifest
 */
async function generateResponsiveSet(inputPath, options, onProgress) {
  const sizes = options.sizes || DEFAULT_SIZES;
  const formats = options.formats || DEFAULT_FORMATS;
  const quality = options.quality || 80;
  const baseName = path.parse(path.basename(inputPath)).name;
  const outputDir = options.outputDir;

  await fs.promises.mkdir(outputDir, { recursive: true });

  const metadata = await sharp(inputPath, { failOn: 'none' }).metadata();
  const manifest = {
    original: { width: metadata.width, height: metadata.height, name: baseName },
    images: [],
    placeholder: null,
    srcset: {},
    html: ''
  };

  const totalSteps = sizes.length * formats.length + 1;
  let currentStep = 0;

  for (const format of formats) {
    const srcsetParts = [];

    for (const width of sizes) {
      if (width > metadata.width) continue; // skip upscaling

      const ext = format === 'jpg' ? '.jpg' : `.${format}`;
      const fileName = `${baseName}-${width}w${ext}`;
      const outputPath = path.join(outputDir, fileName);

      let pipeline = sharp(inputPath, { failOn: 'none' })
        .resize(width, null, { fit: 'inside', withoutEnlargement: true });

      if (format === 'webp') pipeline = pipeline.webp({ quality });
      else if (format === 'avif') pipeline = pipeline.avif({ quality });
      else if (format === 'jpg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      await fs.promises.writeFile(outputPath, data);

      manifest.images.push({
        format, width: info.width, height: info.height,
        size: data.length, fileName, path: outputPath
      });

      srcsetParts.push(`${fileName} ${info.width}w`);

      currentStep++;
      if (onProgress) onProgress({ current: currentStep, total: totalSteps });
    }

    manifest.srcset[format] = srcsetParts.join(', ');
  }

  // Generate blur placeholder
  if (options.generatePlaceholder !== false) {
    const placeholderBuf = await sharp(inputPath, { failOn: 'none' })
      .resize(20, null, { fit: 'inside' })
      .jpeg({ quality: 20 })
      .toBuffer();

    manifest.placeholder = `data:image/jpeg;base64,${placeholderBuf.toString('base64')}`;
    currentStep++;
    if (onProgress) onProgress({ current: currentStep, total: totalSteps });
  }

  // Generate HTML snippet
  manifest.html = generateHtmlSnippet(manifest, baseName);

  // Write manifest
  const manifestPath = path.join(outputDir, `${baseName}-manifest.json`);
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return manifest;
}

function generateHtmlSnippet(manifest, baseName) {
  let html = '<picture>\n';

  if (manifest.srcset.avif) {
    html += `  <source type="image/avif" srcset="${manifest.srcset.avif}"\n          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1920px">\n`;
  }
  if (manifest.srcset.webp) {
    html += `  <source type="image/webp" srcset="${manifest.srcset.webp}"\n          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1920px">\n`;
  }

  const fallback = manifest.images.find(i => i.format === 'jpg' && i.width <= 1280) || manifest.images[0];
  if (fallback) {
    html += `  <img src="${fallback.fileName}" alt="${baseName}" loading="lazy" decoding="async"`;
    html += ` width="${manifest.original.width}" height="${manifest.original.height}"`;
    if (manifest.placeholder) {
      html += `\n       style="background-image:url(${manifest.placeholder});background-size:cover"`;
    }
    html += '>\n';
  }

  html += '</picture>';
  return html;
}

module.exports = { generateResponsiveSet, DEFAULT_SIZES, DEFAULT_FORMATS };
