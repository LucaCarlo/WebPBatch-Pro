const sharp = require('sharp');

/**
 * Generate perceptual hash for an image.
 * @param {string} filePath
 * @returns {Promise<string>} 16-char hex hash
 */
async function generatePHash(filePath) {
  // Resize to 8x8 grayscale
  const { data } = await sharp(filePath, { failOn: 'none' })
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Average pixel value
  let sum = 0;
  for (let i = 0; i < 64; i++) sum += data[i];
  const avg = sum / 64;

  // Build hash: each bit = 1 if pixel > avg
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += data[i] > avg ? '1' : '0';
  }

  // Convert binary string to hex
  return BigInt('0b' + hash).toString(16).padStart(16, '0');
}

/**
 * Compute hamming distance between two hex hashes
 */
function hammingDistance(hash1, hash2) {
  const b1 = BigInt('0x' + hash1);
  const b2 = BigInt('0x' + hash2);
  let xor = b1 ^ b2;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

/**
 * Find duplicate groups in a list of files.
 * @param {Array} files - [{ path, name, ... }]
 * @param {number} threshold - max hamming distance (0=exact, 5=similar, 10=loose)
 * @param {function} onProgress
 * @returns {Promise<Array>} groups
 */
async function findDuplicates(files, threshold, onProgress) {
  threshold = threshold || 5;

  // Phase 1: Generate hashes
  const hashes = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const hash = await generatePHash(files[i].path);
      hashes.push({ file: files[i], hash });
    } catch {
      // Skip files that can't be hashed
    }
    if (onProgress) onProgress({ phase: 'hashing', current: i + 1, total: files.length });
  }

  // Phase 2: Compare pairs and group
  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < hashes.length; i++) {
    if (assigned.has(i)) continue;
    const group = [hashes[i]];

    for (let j = i + 1; j < hashes.length; j++) {
      if (assigned.has(j)) continue;
      const dist = hammingDistance(hashes[i].hash, hashes[j].hash);
      if (dist <= threshold) {
        group.push(hashes[j]);
        assigned.add(j);
      }
    }

    if (group.length > 1) {
      assigned.add(i);
      groups.push({
        files: group.map(g => g.file),
        hash: hashes[i].hash,
        count: group.length,
        similarity: Math.round((1 - (threshold / 64)) * 100)
      });
    }

    if (onProgress) onProgress({ phase: 'comparing', current: i + 1, total: hashes.length });
  }

  return groups;
}

module.exports = { generatePHash, hammingDistance, findDuplicates };
