const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const BOARD_FILE = path.join(__dirname, '../data/board.json');

function readBoard() {
  try {
    if (!fs.existsSync(BOARD_FILE)) return [];
    return JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeBoard(photos) {
  fs.mkdirSync(path.dirname(BOARD_FILE), { recursive: true });
  fs.writeFileSync(BOARD_FILE, JSON.stringify(photos, null, 2));
}

// GET /api/board
router.get('/', (req, res) => {
  res.json(readBoard());
});

// POST /api/board — save a photo
router.post('/', (req, res) => {
  const photo = req.body;
  if (!photo || !photo.id) {
    return res.status(400).json({ error: 'Invalid photo object' });
  }

  const board = readBoard();
  if (board.find((p) => p.id === photo.id)) {
    return res.status(409).json({ error: 'Already saved' });
  }

  const saved = { ...photo, savedAt: new Date().toISOString() };
  board.push(saved);
  writeBoard(board);
  res.json(saved);
});

// DELETE /api/board/:id
router.delete('/:id', (req, res) => {
  const board = readBoard();
  const next = board.filter((p) => p.id !== req.params.id);
  writeBoard(next);
  res.json({ ok: true });
});

// GET /api/board/export — markdown report
router.get('/export', (req, res) => {
  const board = readBoard();
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines = [
    '# Herbert Miller — WWII Archival Research Board',
    '',
    `*Pfc Herbert Henry Miller · Company H, 120th Infantry Regiment, 30th Infantry Division*`,
    `*Serial No. 35740482 · POW No. 85464 · Stalags XII-A, VII-A, XVIII-C*`,
    '',
    `*Exported: ${date}*`,
    '',
    `---`,
    '',
  ];

  for (const photo of board) {
    lines.push(`## ${photo.title}`);
    lines.push('');
    if (photo.thumbnail) {
      lines.push(`![${photo.title}](${photo.thumbnail})`);
      lines.push('');
    }
    lines.push(`- **Source**: ${photo.source}`);
    if (photo.date) lines.push(`- **Date**: ${photo.date}`);
    if (photo.originalUrl) lines.push(`- **Record**: [View original](${photo.originalUrl})`);
    lines.push(`- *Saved: ${new Date(photo.savedAt).toLocaleDateString('en-US')}*`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  if (board.length === 0) {
    lines.push('*No photos saved yet.*');
  }

  const markdown = lines.join('\n');

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="herbert-miller-research-${Date.now()}.md"`
  );
  res.send(markdown);
});

module.exports = router;
