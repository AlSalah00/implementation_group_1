const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../../blockchain/artifacts-export/CredentialRegistry.json');
const dest = path.resolve(__dirname, '../lib/CredentialRegistry.json');

try {
  const data = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dest, data, 'utf8');
  console.log(`Synced artifact: ${src} -> ${dest}`);
} catch (err) {
  // Don't fail the dev server if the artifact isn't present yet.
  console.warn('sync-artifact: could not copy artifact as it may not exist yet.', err.message || err);
}
