# CLAUDE.md — Herbert Miller WWII Archival Research Tool

This file gives AI assistants the context needed to work effectively in this codebase.

---

## Project Purpose

A local web application for researching the WWII service history of **Pfc Herbert Henry Miller**
(Company H, 120th Infantry Regiment, 30th Infantry Division, U.S. Army, Serial No. 35740482).

The app proxies searches across four archival photograph APIs and provides a "Research Board"
to save and export results as a Markdown report.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 4, CommonJS modules |
| Frontend | React 18, Vite 5, plain CSS (no CSS-in-JS) |
| HTTP client | Axios (server-side only) |
| Persistence | Flat JSON file (`data/board.json`) |
| Env config | `dotenv` via `.env` file |

---

## Architecture

```
client/  (Vite dev server: port 5173)
  └─ proxies /api/* → Express (port 3001)

server.js
  ├─ routes/search.js   →  /api/search?q=TERM
  ├─ routes/board.js    →  /api/board (CRUD + markdown export)
  └─ services/
       ├─ nara.js        NARA Catalog API
       ├─ loc.js         Library of Congress Pictures API
       ├─ wikimedia.js   Wikimedia Commons MediaWiki API
       └─ europeana.js   Europeana API (requires EUROPEANA_API_KEY)
```

In production, `npm run build` compiles the React app into `/public/` and Express serves it statically.

---

## Running the App

```bash
# Install all dependencies (root + client)
npm run install:all

# Development (Express + Vite, concurrently)
npm run dev

# Production build + serve
npm run build && npm start
```

---

## Normalized Photo Object

Every archive service normalizes its response to this shape:

```js
{
  id:          string,   // e.g. "nara-12345", "loc-0-title", "wikimedia-67890", "europeana-/xx/yy"
  source:      string,   // 'NARA' | 'LOC' | 'Wikimedia' | 'Europeana'
  title:       string,
  date:        string | null,
  thumbnail:   string | null,  // absolute URL
  originalUrl: string | null,  // link to the archival record page
  savedAt:     string | null,  // ISO timestamp, set only for board items
}
```

When adding a new archive source, implement this same shape in a new `services/*.js` file
and register it in `routes/search.js`.

---

## API Routes

### `GET /api/search?q=TERM`

Searches all four archives in parallel (`Promise.all`). Returns:

```json
{
  "results": [ ...normalizedPhotoObjects ],
  "status": {
    "nara":      { "count": 5,  "error": null },
    "loc":       { "count": 3,  "error": null },
    "wikimedia": { "count": 8,  "error": null },
    "europeana": { "count": 0,  "error": "EUROPEANA_API_KEY not configured in .env" }
  }
}
```

A source failure never crashes the whole request — each source's error is captured individually.

### `GET /api/board`

Returns the full saved board as a JSON array.

### `POST /api/board`

Body: a normalized photo object. Returns the saved object (with `savedAt`).
Returns `409` if the photo is already on the board.

### `DELETE /api/board/:id`

Removes the photo with the given `id` from the board.

### `GET /api/board/export`

Returns a `text/markdown` file download — the full research report.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default 3001) | Express server port |
| `EUROPEANA_API_KEY` | Optional | Free key from https://apis.europeana.eu/ |

Copy `.env.example` to `.env`. Without `EUROPEANA_API_KEY`, Europeana searches return an error
in `status.europeana` but the other three archives still work.

---

## Frontend State (App.jsx)

| State | Type | Description |
|---|---|---|
| `results` | `Photo[]` | Current search results (all sources merged) |
| `sourceStatus` | `{nara, loc, wikimedia, europeana}` | Per-source `{count, error, loading}` |
| `loading` | `boolean` | True while the search request is in-flight |
| `lastQuery` | `string` | The most recently executed query |
| `savedPhotos` | `Photo[]` | Board contents, loaded from `/api/board` on mount |
| `boardOpen` | `boolean` | Controls the Research Board sidebar visibility |

---

## Adding a New Archive Source

1. Create `services/myarchive.js` exporting `async function search(query)` → `Photo[]`
2. Add it to the `sources` map in `routes/search.js`
3. Add its label to `SOURCE_LABELS` in `client/src/components/SourceStatus.jsx`
4. Add a badge color in `SOURCE_COLORS` in `client/src/components/PhotoCard.jsx`

---

## Key Conventions

- **Backend uses CommonJS** (`require`/`module.exports`). Do not use ESM `import` in server files.
- **Client uses ESM** (`import`/`export`). Vite handles transpilation.
- **CSS**: All styles live in `client/src/App.css` using CSS custom properties. No Tailwind, no CSS modules.
- **Error isolation**: Each archive service is wrapped in try/catch inside `routes/search.js`. One failing API should never prevent results from other sources.
- **No database**: The board is a flat `data/board.json` file. This is intentional — keep it simple.
- **Axios timeout**: All service files set `timeout: 15000`. Don't remove this — archival APIs can be slow.
- **CORS**: Handled server-side. All external API calls go through Express; the frontend never calls external APIs directly.

---

## Subject Reference

| Field | Detail |
|---|---|
| Name | Herbert Henry Miller |
| Rank | Private First Class |
| Unit | Company H, 120th Infantry Regiment, 30th Infantry Division |
| Serial Number | 35740482 |
| Landed Omaha Beach | June 11, 1944 |
| Captured | August 6, 1944 at Mortain, France (Operation Lüttich) |
| German POW No. | 85464 |
| Stalags held | XII-A, VII-A (Moosburg, Bavaria), XVIII-C (Markt Pongau, Austria) |
| Liberated | May 13, 1945 |

Preset search queries are defined in `client/src/components/SearchBar.jsx` and cover:
`30th Infantry Division Normandy`, `Mortain 1944`, `Operation Lüttich`,
`120th Infantry Regiment`, `Stalag VII-A Moosburg`, `Stalag XVIII-C Markt Pongau`.
