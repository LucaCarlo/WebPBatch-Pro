#!/usr/bin/env node
/**
 * Launcher script that ensures ELECTRON_RUN_AS_NODE is not set.
 * VSCode terminals set ELECTRON_RUN_AS_NODE=1, which prevents Electron from
 * initializing its browser process. This script removes it before spawning.
 */
const { spawn } = require('child_process');
const electronPath = require('electron');

// Remove the env variable that forces Electron into Node.js mode
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env,
  cwd: __dirname
});

child.on('close', (code) => process.exit(code));
child.on('error', (err) => {
  console.error('Failed to start Electron:', err.message);
  process.exit(1);
});
