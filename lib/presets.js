const fs = require('fs');
const path = require('path');

/**
 * Load all presets: built-in + user custom
 */
async function loadPresets(builtinDir, userDir) {
  const presets = [];

  // Load built-in
  if (fs.existsSync(builtinDir)) {
    const files = fs.readdirSync(builtinDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(builtinDir, file), 'utf-8'));
        data._builtin = true;
        presets.push(data);
      } catch { /* skip corrupt preset */ }
    }
  }

  // Load user presets
  if (userDir !== builtinDir && fs.existsSync(userDir)) {
    const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json') && f.startsWith('custom-'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(userDir, file), 'utf-8'));
        data._builtin = false;
        presets.push(data);
      } catch { /* skip corrupt preset */ }
    }
  }

  return presets;
}

/**
 * Save a custom preset
 */
async function savePreset(userDir, preset) {
  try {
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    const id = preset.id || `custom-${Date.now()}`;
    preset.id = id;
    const filePath = path.join(userDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(preset, null, 2), 'utf-8');
    return { success: true, preset };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a custom preset
 */
async function deletePreset(userDir, presetId) {
  try {
    const filePath = path.join(userDir, `${presetId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Export a preset to a chosen path
 */
async function exportPreset(filePath, preset) {
  try {
    const exportData = { ...preset };
    delete exportData._builtin;
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Import a preset from file
 */
async function importPreset(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!data.name) return { success: false, error: 'Preset non valido: nome mancante' };
    data.id = `custom-${Date.now()}`;
    data._builtin = false;
    return { success: true, preset: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { loadPresets, savePreset, deletePreset, exportPreset, importPreset };
