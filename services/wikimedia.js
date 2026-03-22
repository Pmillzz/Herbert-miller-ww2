const axios = require('axios');

const API_URL = 'https://commons.wikimedia.org/w/api.php';
const THUMB_WIDTH = 320;

async function search(query) {
  // Step 1: search for files in Commons
  const searchResp = await axios.get(API_URL, {
    params: {
      action: 'query',
      list: 'search',
      srsearch: `${query} filetype:bitmap`,
      srnamespace: 6,
      srlimit: 20,
      format: 'json',
      origin: '*',
    },
    timeout: 15000,
  });

  const hits = searchResp.data?.query?.search;
  if (!hits || hits.length === 0) return [];

  // Step 2: get image info + thumbnails for the matched files
  const titles = hits.map((h) => h.title).join('|');
  const infoResp = await axios.get(API_URL, {
    params: {
      action: 'query',
      titles,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: THUMB_WIDTH,
      format: 'json',
      origin: '*',
    },
    timeout: 15000,
  });

  const pages = infoResp.data?.query?.pages || {};

  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return null;

      const meta = info.extmetadata || {};
      const title =
        meta.ObjectName?.value ||
        meta.ImageDescription?.value?.replace(/<[^>]+>/g, '') ||
        page.title.replace('File:', '') ||
        'Untitled';

      const date =
        meta.DateTimeOriginal?.value ||
        meta.DateTime?.value ||
        null;

      const thumbnail = info.thumburl || null;
      const originalUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;

      return {
        id: `wikimedia-${page.pageid}`,
        source: 'Wikimedia',
        title: title.slice(0, 200),
        date,
        thumbnail,
        originalUrl,
      };
    })
    .filter((p) => p && p.thumbnail);
}

module.exports = { search };
