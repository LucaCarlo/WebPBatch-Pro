const sharp = require('sharp');

const PLATFORM_RATIOS = {
  'instagram-post': { w: 4, h: 5, label: 'Instagram Post' },
  'instagram-story': { w: 9, h: 16, label: 'Instagram Story' },
  'tiktok': { w: 9, h: 16, label: 'TikTok' },
  'youtube-thumb': { w: 16, h: 9, label: 'YouTube Thumbnail' },
  'pinterest': { w: 2, h: 3, label: 'Pinterest' },
  'facebook-post': { w: 1, h: 1, label: 'Facebook Post' },
  'web-landscape': { w: 16, h: 9, label: 'Web Landscape' }
};

/**
 * Smart crop an image based on subject region and target aspect ratio.
 * @param {string} inputPath
 * @param {string} platformId - key from PLATFORM_RATIOS
 * @param {object} subjectRegion - { x, y, w, h } as percentages (0-100)
 * @returns {Promise<{ buffer: Buffer, info: object }>}
 */
async function smartCrop(inputPath, platformId, subjectRegion) {
  const ratio = PLATFORM_RATIOS[platformId];
  if (!ratio) throw new Error('Piattaforma non supportata: ' + platformId);

  const metadata = await sharp(inputPath, { failOn: 'none' }).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;

  // Convert subject region percentages to pixels
  const sx = Math.floor(imgW * subjectRegion.x / 100);
  const sy = Math.floor(imgH * subjectRegion.y / 100);
  const sw = Math.floor(imgW * subjectRegion.w / 100);
  const sh = Math.floor(imgH * subjectRegion.h / 100);

  // Subject center
  const scx = sx + sw / 2;
  const scy = sy + sh / 2;

  // Calculate crop dimensions with target aspect ratio
  const targetRatio = ratio.w / ratio.h;
  let cropW, cropH;

  if (imgW / imgH > targetRatio) {
    // Image is wider than target ratio — constrain by height
    cropH = imgH;
    cropW = Math.floor(imgH * targetRatio);
  } else {
    // Image is taller than target ratio — constrain by width
    cropW = imgW;
    cropH = Math.floor(imgW / targetRatio);
  }

  // Ensure crop doesn't exceed image bounds
  cropW = Math.min(cropW, imgW);
  cropH = Math.min(cropH, imgH);

  // Position crop centered on subject (golden zone: place subject at 1/3)
  let left = Math.floor(scx - cropW / 2);
  let top = Math.floor(scy - cropH / 3); // Place subject in upper third

  // Clamp to image bounds
  left = Math.max(0, Math.min(left, imgW - cropW));
  top = Math.max(0, Math.min(top, imgH - cropH));

  const { data, info } = await sharp(inputPath, { failOn: 'none' })
    .extract({ left, top, width: cropW, height: cropH })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, info, crop: { left, top, width: cropW, height: cropH } };
}

module.exports = { smartCrop, PLATFORM_RATIOS };
