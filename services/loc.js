const axios = require('axios');

const BASE_URL = 'https://www.loc.gov/pictures/search/';

function normalizeResult(item, index) {
  const title = Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled';
  const date = item.date || null;
  const link = item.link || (item.item && item.item.link) || null;

  // Thumbnail — LOC returns image object with various size keys
  let thumbnail = null;
  const img = item.image;
  if (img) {
    thumbnail = img.thumb || img['320'] || img.full || null;
  }

  return {
    id: `loc-${index}-${encodeURIComponent(title).slice(0, 20)}`,
    source: 'LOC',
    title,
    date,
    thumbnail,
    originalUrl: link,
  };
}

async function search(query) {
  const params = {
    q: query,
    fo: 'json',
    c: 20,
    sp: 1,
  };

  const response = await axios.get(BASE_URL, { params, timeout: 15000 });
  const results = response.data?.results;

  if (!results || !Array.isArray(results)) return [];

  return results
    .map((item, i) => normalizeResult(item, i))
    .filter((p) => p.thumbnail);
}

module.exports = { search };
