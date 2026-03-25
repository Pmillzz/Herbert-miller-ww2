const axios = require('axios');

// The loc.gov domain is protected by Cloudflare bot detection, which blocks
// all server-side (non-browser) requests. We use the tile.loc.gov CDN for
// images in the image proxy allowlist, but the search API is unavailable.
// See: https://www.loc.gov/apis/json-and-yaml/

async function search(/* query */) {
  throw new Error('LOC search is unavailable — loc.gov is blocked by Cloudflare for server-side requests');
}

module.exports = { search };
