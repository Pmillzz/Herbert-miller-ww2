/**
 * One-time setup script — runs automatically as part of `npm run install:all`.
 *
 * What it does (all cross-platform, no shell dependencies):
 *   1. Creates .env from .env.example  (skipped if .env already exists)
 *   2. Creates the data/ directory
 *   3. Copies face-api model weights → client/public/models/
 *   4. Prints a "what's next" summary
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── Helpers ────────────────────────────────────────────────────

function ok(msg)   { console.log(`  \x1b[32m✓\x1b[0m  ${msg}`); }
function skip(msg) { console.log(`  \x1b[33m–\x1b[0m  ${msg}`); }
function err(msg)  { console.error(`  \x1b[31m✗\x1b[0m  ${msg}`); }
function heading(msg) { console.log(`\n\x1b[1m${msg}\x1b[0m`); }

// ── Step 1: .env ───────────────────────────────────────────────

heading('Herbert Miller WWII Research Tool — Setup');

const envDest    = path.join(ROOT, '.env');
const envExample = path.join(ROOT, '.env.example');

if (fs.existsSync(envDest)) {
  skip('.env already exists — keeping your existing config');
} else if (!fs.existsSync(envExample)) {
  err('.env.example not found — skipping .env creation');
} else {
  fs.copyFileSync(envExample, envDest);
  ok('Created .env from .env.example');
  console.log('     \x1b[2mOptional: add your EUROPEANA_API_KEY to .env for Europeana searches\x1b[0m');
}

// ── Step 2: data/ directory ────────────────────────────────────

const dataDir = path.join(ROOT, 'data');
fs.mkdirSync(dataDir, { recursive: true });
ok('data/ directory ready');

// ── Step 3: face-api model weights ────────────────────────────

const modelSrc  = path.join(ROOT, 'client', 'node_modules', '@vladmandic', 'face-api', 'model');
const modelDest = path.join(ROOT, 'client', 'public', 'models');

const PREFIXES = ['ssd_mobilenetv1', 'face_landmark_68', 'face_recognition_model'];

if (!fs.existsSync(modelSrc)) {
  err('@vladmandic/face-api not found — run: npm install --prefix client');
  err('Then run: node scripts/setup.js');
  process.exit(1);
}

fs.mkdirSync(modelDest, { recursive: true });

let copied = 0;
for (const file of fs.readdirSync(modelSrc)) {
  if (PREFIXES.some((p) => file.startsWith(p))) {
    fs.copyFileSync(path.join(modelSrc, file), path.join(modelDest, file));
    copied++;
  }
}
ok(`Copied ${copied} face-detection model files → client/public/models/`);

// ── Done ───────────────────────────────────────────────────────

console.log('\n\x1b[32m\x1b[1mSetup complete!\x1b[0m Start the app with:\n');
console.log('    \x1b[1mnpm run dev\x1b[0m\n');
console.log('Then open \x1b[36mhttp://localhost:5173\x1b[0m in your browser.\n');
