const path = require('path');

/**
 * Generate output filename from template.
 * Variables: {name}, {w}, {h}, {date}, {counter}, {ext}
 * @param {string} template - e.g. "{name}-{w}x{h}"
 * @param {object} data - { originalName, width, height, counter }
 * @param {string} outputExt - e.g. ".webp"
 * @returns {string}
 */
function generateName(template, data, outputExt) {
  const baseName = path.parse(data.originalName).name;
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const counterStr = String(data.counter || 1).padStart(3, '0');

  let result = template
    .replace(/\{name\}/gi, baseName)
    .replace(/\{w\}/gi, String(data.width || 0))
    .replace(/\{h\}/gi, String(data.height || 0))
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{counter\}/gi, counterStr);

  // Sanitize: remove invalid filename characters
  result = result.replace(/[<>:"/\\|?*]/g, '_');

  return result + outputExt;
}

/**
 * Get unique filename to avoid overwrite.
 * Appends -001, -002, etc. if file exists.
 */
function getUniquePath(outputDir, fileName) {
  let fullPath = path.join(outputDir, fileName);
  if (!require('fs').existsSync(fullPath)) return fullPath;

  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;

  while (require('fs').existsSync(fullPath)) {
    fullPath = path.join(outputDir, `${base}-${String(counter).padStart(3, '0')}${ext}`);
    counter++;
  }

  return fullPath;
}

/**
 * Get output extension for format
 */
function getOutputExtension(format) {
  switch ((format || 'webp').toLowerCase()) {
    case 'webp': return '.webp';
    case 'jpg':
    case 'jpeg': return '.jpg';
    case 'png': return '.png';
    case 'avif': return '.avif';
    default: return '.webp';
  }
}

module.exports = { generateName, getUniquePath, getOutputExtension };
