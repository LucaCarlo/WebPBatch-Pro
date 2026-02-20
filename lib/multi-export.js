const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PLATFORMS = [
  { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1350, format: 'jpg', quality: 85, fit: 'cover' },
  { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920, format: 'jpg', quality: 85, fit: 'cover' },
  { id: 'tiktok', name: 'TikTok', width: 1080, height: 1920, format: 'jpg', quality: 85, fit: 'cover' },
  { id: 'youtube-thumb', name: 'YouTube Thumbnail', width: 1280, height: 720, format: 'jpg', quality: 90, fit: 'cover' },
  { id: 'pinterest', name: 'Pinterest', width: 1000, height: 1500, format: 'jpg', quality: 80, fit: 'cover' },
  { id: 'web-webp', name: 'Web WebP', longEdge: 1920, format: 'webp', quality: 80, fit: 'inside' }
];

/**
 * Export an image for multiple platforms.
 * @param {string} inputPath
 * @param {string[]} platformIds - which platforms to export for
 * @param {string} outputDir - base output directory
 * @param {function} onProgress - callback({ platform, status, current, total })
 * @returns {Promise<object>} results
 */
async function multiExport(inputPath, platformIds, outputDir, onProgress) {
  const platforms = PLATFORMS.filter(p => platformIds.includes(p.id));
  const baseName = path.parse(path.basename(inputPath)).name;
  const results = [];
  let current = 0;

  for (const platform of platforms) {
    current++;
    if (onProgress) onProgress({ platform: platform.name, status: 'processing', current, total: platforms.length });

    try {
      // Create platform subfolder
      const platformDir = path.join(outputDir, platform.name);
      await fs.promises.mkdir(platformDir, { recursive: true });

      let pipeline = sharp(inputPath, { failOn: 'none' });

      // Resize
      if (platform.longEdge) {
        pipeline = pipeline.resize(platform.longEdge, platform.longEdge, { fit: 'inside', withoutEnlargement: true });
      } else {
        pipeline = pipeline.resize(platform.width, platform.height, {
          fit: platform.fit || 'cover',
          position: 'centre',
          withoutEnlargement: false
        });
      }

      // Format
      const ext = platform.format === 'webp' ? '.webp' : '.jpg';
      if (platform.format === 'webp') {
        pipeline = pipeline.webp({ quality: platform.quality });
      } else {
        pipeline = pipeline.jpeg({ quality: platform.quality, mozjpeg: true });
      }

      const outputPath = path.join(platformDir, `${baseName}${ext}`);
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

      // Atomic write
      const tmpPath = outputPath + '.tmp';
      await fs.promises.writeFile(tmpPath, data);
      await fs.promises.rename(tmpPath, outputPath);

      results.push({
        platform: platform.name,
        id: platform.id,
        status: 'done',
        outputPath,
        width: info.width,
        height: info.height,
        size: data.length
      });

      if (onProgress) onProgress({ platform: platform.name, status: 'done', current, total: platforms.length });
    } catch (err) {
      results.push({ platform: platform.name, id: platform.id, status: 'error', error: err.message });
      if (onProgress) onProgress({ platform: platform.name, status: 'error', current, total: platforms.length });
    }
  }

  return { results, total: platforms.length, success: results.filter(r => r.status === 'done').length };
}

module.exports = { multiExport, PLATFORMS };
