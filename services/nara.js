const axios = require('axios');

const BASE_URL = 'https://catalog.archives.gov/api/v1/';

/**
 * Normalize a single NARA result into our common photo shape.
 */
function normalizeResult(item) {
  const naId = item.naId || '';
  const desc = item.description || {};

  // Description can be keyed as 'item', 'fileUnit', 'series', etc.
  const descBody = desc.item || desc.fileUnit || desc.series || desc.recordGroup || {};

  const title =
    descBody.title ||
    (Array.isArray(descBody.title) ? descBody.title[0] : null) ||
    'Untitled';

  // Date — productionDateArray or scopeAndContentNote year
  let date = null;
  const pda = descBody.productionDateArray;
  if (pda) {
    const entry = Array.isArray(pda.proposableQualifiableDate)
      ? pda.proposableQualifiableDate[0]
      : pda.proposableQualifiableDate;
    date = entry?.year || entry?.logicalDate || null;
  }

  // Thumbnail — try objects first, then thumbnailFile
  let thumbnail = null;
  const objects = item.objects;
  if (objects) {
    const obj = Array.isArray(objects.object) ? objects.object[0] : objects.object;
    if (obj?.thumbnail?.['@url']) {
      thumbnail = obj.thumbnail['@url'];
    } else if (obj?.file?.['@url']) {
      thumbnail = obj.file['@url'];
    }
  }
  if (!thumbnail && descBody.thumbnailFile?.['@url']) {
    thumbnail = descBody.thumbnailFile['@url'];
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
  const params = {
    q: query,
    resultTypes: 'item',
    rows: 20,
    offset: 0,
  };

  const response = await axios.get(BASE_URL, { params, timeout: 15000 });
  const raw = response.data?.opaResponse?.results?.result;

  if (!raw) return [];

  const results = Array.isArray(raw) ? raw : [raw];
  return results
    .map(normalizeResult)
    .filter((p) => p.thumbnail); // only photos with a visible image
}

module.exports = { search };
