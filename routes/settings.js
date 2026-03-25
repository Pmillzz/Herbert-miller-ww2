const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');
const MANAGED_KEYS = ['NARA_API_KEY', 'EUROPEANA_API_KEY'];

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// GET /api/settings — returns current key values (saved settings override .env)
router.get('/', (req, res) => {
  const saved = loadSettings();
  const result = {};
  for (const key of MANAGED_KEYS) {
    result[key] = saved[key] || process.env[key] || '';
  }
  res.json(result);
});

// POST /api/settings — save keys; takes effect immediately (no restart needed)
router.post('/', (req, res) => {
  const saved = loadSettings();
  for (const key of MANAGED_KEYS) {
    if (req.body[key] !== undefined) {
      const val = String(req.body[key]).trim();
      saved[key] = val;
      // Apply to running process immediately so services pick it up on next search
      if (val) {
        process.env[key] = val;
      } else {
        delete process.env[key];
      }
    }
  }
  saveSettings(saved);
  res.json({ ok: true });
});

module.exports = { router, loadSettings };
