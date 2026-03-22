const express = require('express');
const router = express.Router();
const axios = require('axios');

// Only proxy images from known archival domains — prevents SSRF abuse
const ALLOWED_DOMAINS = [
  'catalog.archives.gov',
  'nara.gov',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'cdn.loc.gov',
  'www.loc.gov',
  'thumbnails.europeana.eu',
  'api.europeana.eu',
  'ids.si.edu',
];

function isAllowedUrl(urlStr) {
  try {
    const { hostname } = new URL(urlStr);
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

// GET /api/proxy-image?url=https://...
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url parameter');
  if (!isAllowedUrl(url)) return res.status(403).send('Domain not in allowlist');

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'HerbertMillerResearch/1.0' },
      maxRedirects: 3,
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(response.data));
  } catch (err) {
    res.status(502).send(`Failed to fetch image: ${err.message}`);
  }
});

module.exports = router;
