const axios = require('axios');

const BASE_URL = 'https://api.europeana.eu/record/v2/search.json';

function normalizeResult(item) {
  const title = Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled';
  const date = Array.isArray(item.year) ? item.year[0] : item.year || null;
  const thumbnail = Array.isArray(item.edmPreview) ? item.edmPreview[0] : item.edmPreview || null;
  const originalUrl = item.guid || null;

  return {
    id: `europeana-${item.id?.replace(/\//g, '-')}`,
    source: 'Europeana',
    title,
    date,
    thumbnail,
    originalUrl,
  };
}

async function search(query) {
  const apiKey = process.env.EUROPEANA_API_KEY;
  if (!apiKey) {
    throw new Error('EUROPEANA_API_KEY not configured in .env');
  }

  const response = await axios.get(BASE_URL, {
    params: {
      wskey: apiKey,
      query,
      media: true,
      'qf': 'TYPE:IMAGE',
      rows: 20,
    },
    timeout: 15000,
  });

  const items = response.data?.items;
  if (!items || !Array.isArray(items)) return [];

  return items
    .map(normalizeResult)
    .filter((p) => p.thumbnail);
}

module.exports = { search };
