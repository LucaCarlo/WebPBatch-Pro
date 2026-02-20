const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tiff', '.tif', '.bmp'
]);

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

async function getImageDimensions(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width || 0, height: meta.height || 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}

async function scanPath(inputPath, includeSubfolders, results) {
  const stat = await fs.promises.stat(inputPath);

  if (stat.isFile()) {
    if (isImageFile(inputPath)) {
      const dims = await getImageDimensions(inputPath);
      results.push({
        path: inputPath,
        name: path.basename(inputPath),
        size: stat.size,
        ext: path.extname(inputPath).toLowerCase(),
        dir: path.dirname(inputPath),
        width: dims.width,
        height: dims.height
      });
    }
  } else if (stat.isDirectory()) {
    const entries = await fs.promises.readdir(inputPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(inputPath, entry.name);
      if (entry.isFile() && isImageFile(entry.name)) {
        const fileStat = await fs.promises.stat(fullPath);
        const dims = await getImageDimensions(fullPath);
        results.push({
          path: fullPath,
          name: entry.name,
          size: fileStat.size,
          ext: path.extname(entry.name).toLowerCase(),
          dir: inputPath,
          width: dims.width,
          height: dims.height
        });
      } else if (entry.isDirectory() && includeSubfolders) {
        await scanPath(fullPath, true, results);
      }
    }
  }
}

async function scanDirectory(paths, includeSubfolders = true) {
  const results = [];
  for (const p of paths) {
    await scanPath(p, includeSubfolders, results);
  }
  // Deduplicate by path
  const seen = new Set();
  return results.filter(f => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  });
}

module.exports = { scanDirectory, SUPPORTED_EXTENSIONS };
