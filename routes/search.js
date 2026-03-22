const express = require('express');
const router = express.Router();

const nara = require('../services/nara');
const loc = require('../services/loc');
const wikimedia = require('../services/wikimedia');
const europeana = require('../services/europeana');

// GET /api/search?q=TERM
router.get('/', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  const sources = { nara, loc, wikimedia, europeana };
  const results = [];
  const status = {};

  await Promise.all(
    Object.entries(sources).map(async ([name, service]) => {
      try {
        const photos = await service.search(query);
        results.push(...photos);
        status[name] = { count: photos.length, error: null };
      } catch (err) {
        status[name] = { count: 0, error: err.message || 'Search failed' };
      }
    })
  );

  res.json({ results, status });
});

module.exports = router;
