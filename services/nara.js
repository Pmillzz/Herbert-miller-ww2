const axios = require('axios');

const BASE_URL = 'https://catalog.archives.gov/api/v2/records/search';

/**
 * Normalize a single NARA v2 hit into our common photo shape.
 */
function normalizeResult(hit) {
  const record = hit._source?.record || {};
  const naId = record.naId || hit._id || '';

  const title = record.title || 'Untitled';

  // Date — productionDates array
  let date = null;
  const pd = record.productionDates;
  if (Array.isArray(pd) && pd.length > 0) {
    date = pd[0].logicalDate || String(pd[0].year) || null;
  }

  // Thumbnail — first digitalObject that is an image
  let thumbnail = null;
  const objects = record.digitalObjects;
  if (Array.isArray(objects)) {
    const imgObj = objects.find((o) => {
      const type = (o.objectType || '').toLowerCase();
      const fname = (o.objectFilename || '').toLowerCase();
      return type.includes('image') || fname.endsWith('.jpg') || fname.endsWith('.jpeg') || fname.endsWith('.tif');
    });
    if (imgObj?.objectUrl) {
      thumbnail = imgObj.objectUrl;
    }
  }

  return {
    id: `nara-${naId}`,
    source: 'NARA',
    title,
    date,
    thumbnail,
    originalUrl: naId ? `https://catalog.archives.gov/id/${naId}` : null,
  };
}

async function search(query) {
  const apiKey = process.env.NARA_API_KEY;
  if (!apiKey) {
    throw new Error('NARA_API_KEY not configured in .env — email Catalog_API@nara.gov to request a free key');
  }

  const response = await axios.get(BASE_URL, {
    params: {
      q: query,
      typeOfMaterials: 'photographs and other graphic materials',
      availableOnline: true,
      rows: 20,
    },
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  const hits = response.data?.body?.hits?.hits;
  if (!Array.isArray(hits)) return [];

  return hits
    .map(normalizeResult)
    .filter((p) => p.thumbnail);
}

module.exports = { search };
