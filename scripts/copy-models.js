/**
 * Copies the required face-api.js model weight files from the npm package
 * into client/public/models/ so they can be served as static assets.
 *
 * Runs automatically as part of `npm run install:all`.
 * Re-run manually: node scripts/copy-models.js
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../client/node_modules/@vladmandic/face-api/model');
const DEST = path.join(__dirname, '../client/public/models');

if (!fs.existsSync(SRC)) {
  console.error('ERROR: @vladmandic/face-api not found. Run: npm install --prefix client');
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });

// Only the three model families we use
const PREFIXES = ['ssd_mobilenetv1', 'face_landmark_68', 'face_recognition_model'];

let copied = 0;
for (const file of fs.readdirSync(SRC)) {
  if (PREFIXES.some((p) => file.startsWith(p))) {
    fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
    console.log(`  ✓ ${file}`);
    copied++;
  }
}

console.log(`\nCopied ${copied} model files → client/public/models/`);
