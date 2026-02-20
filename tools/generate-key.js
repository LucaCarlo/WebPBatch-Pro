#!/usr/bin/env node
/**
 * Tool CLI per generare chiavi licenza WebPBatch Pro.
 * Uso: node tools/generate-key.js <email-o-identificativo>
 */

const { generateLicenseKey } = require('../lib/license');

const identifier = process.argv[2];

if (!identifier) {
  console.log('Uso: node tools/generate-key.js <email-o-identificativo>');
  console.log('Esempio: node tools/generate-key.js cliente@example.com');
  process.exit(1);
}

const key = generateLicenseKey(identifier);
console.log(`\nIdentificativo: ${identifier}`);
console.log(`Chiave licenza: ${key}\n`);
