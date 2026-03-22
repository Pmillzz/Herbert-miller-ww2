const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const REF_FILE = path.join(__dirname, '../data/reference-faces.json');
const HISTORY_FILE = path.join(__dirname, '../data/scan-history.json');

function read(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── Reference faces ────────────────────────────────────────────

// GET /api/faces/reference
router.get('/reference', (req, res) => res.json(read(REF_FILE)));

// POST /api/faces/reference
// Body: { filename, thumbnail (data URL, small), descriptor (number[]) }
router.post('/reference', (req, res) => {
  const { filename, thumbnail, descriptor } = req.body;
  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid descriptor' });
  }

  const refs = read(REF_FILE);
  const entry = {
    id: `ref-${Date.now()}`,
    filename: filename || 'photo.jpg',
    thumbnail: thumbnail || null,
    descriptor,
    uploadedAt: new Date().toISOString(),
  };
  refs.push(entry);
  write(REF_FILE, refs);
  res.json(entry);
});

// DELETE /api/faces/reference/:id
router.delete('/reference/:id', (req, res) => {
  const refs = read(REF_FILE).filter((r) => r.id !== req.params.id);
  write(REF_FILE, refs);
  res.json({ ok: true });
});

// ── Scan history ───────────────────────────────────────────────

// GET /api/faces/history — full history, sorted by matchScore ascending (best first)
router.get('/history', (req, res) => {
  const history = read(HISTORY_FILE);
  history.sort((a, b) => {
    // null score (no face) goes to end
    if (a.matchScore === null) return 1;
    if (b.matchScore === null) return -1;
    return a.matchScore - b.matchScore;
  });
  res.json(history);
});

// GET /api/faces/history/stats
router.get('/history/stats', (req, res) => {
  const history = read(HISTORY_FILE);
  const refs = read(REF_FILE);
  const currentRefIds = new Set(refs.map((r) => r.id));

  const total = history.length;
  const withFace = history.filter((h) => h.faceDetected).length;
  const matches = history.filter((h) => h.isMatch).length;
  const needsRescan = history.filter((h) => {
    const used = new Set(h.referenceIds || []);
    // outdated if any current reference wasn't used, or a used ref no longer exists
    if (refs.some((r) => !used.has(r.id))) return true;
    if ([...used].some((id) => !currentRefIds.has(id))) return true;
    return false;
  }).length;

  res.json({ total, withFace, matches, needsRescan });
});

// POST /api/faces/history — upsert a scan result by photoId
// Body: { photoId, source, title, thumbnailUrl, originalUrl, referenceIds,
//         matchScore, faceDetected, isMatch }
router.post('/history', (req, res) => {
  const entry = req.body;
  if (!entry?.photoId) return res.status(400).json({ error: 'Missing photoId' });

  const history = read(HISTORY_FILE);
  const idx = history.findIndex((h) => h.photoId === entry.photoId);
  const record = { ...entry, scannedAt: new Date().toISOString() };

  if (idx >= 0) history[idx] = record;
  else history.push(record);

  write(HISTORY_FILE, history);
  res.json(record);
});

// DELETE /api/faces/history — clear all history (to force full re-scan)
router.delete('/history', (req, res) => {
  write(HISTORY_FILE, []);
  res.json({ ok: true });
});

module.exports = router;
