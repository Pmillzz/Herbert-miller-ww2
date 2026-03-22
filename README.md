# Herbert Miller — WWII Archival Photo Research Tool

A local web app for researching the WWII service history of **Pfc Herbert Henry Miller**,
Company H, 120th Infantry Regiment, 30th Infantry Division, U.S. Army (Serial No. 35740482).

Searches photographs across four archival sources simultaneously and uses **facial recognition**
to automatically flag potential photographs of Herbert as you browse.

| Source | API | Key Required |
|---|---|---|
| National Archives (NARA) | catalog.archives.gov/api/v1 | No |
| Library of Congress | loc.gov/pictures | No |
| Wikimedia Commons | commons.wikimedia.org/w/api.php | No |
| Europeana | api.europeana.eu | Yes (free, optional) |

---

## Setup — two commands

Works on **Windows, macOS, and Linux**. No shell scripts, no Unix tools required.

**Prerequisites:** [Node.js 18+](https://nodejs.org)

```
npm run install:all
npm run dev
```

That's it. The first command installs dependencies, copies face-detection model weights,
and creates a `.env` file automatically. Open **http://localhost:5173** when the second
command is running.

### What `npm run install:all` does

```
✓  Created .env from .env.example
✓  data/ directory ready
✓  Copied 8 face-detection model files → client/public/models/

Setup complete! Start the app with:

    npm run dev
```

### Europeana (optional)

Europeana searches are disabled by default. To enable them:

1. Get a free API key at https://apis.europeana.eu/
2. Open `.env` and set `EUROPEANA_API_KEY=your_key_here`

The other three archives work without any key.

---

## Features

- **Unified search** across all four archives with one query
- **Preset buttons** for key research topics:
  - 30th Infantry Division Normandy · Mortain 1944 · Operation Lüttich
  - 120th Infantry Regiment · Stalag VII-A Moosburg · Stalag XVIII-C Markt Pongau
- **Per-source status** — shows result count or error for each archive
- **Photo grid** with thumbnail, source badge, title, date, and link to original record
- **Face ID** — upload photos of Herbert; the app scans archive results in the background
  and highlights potential matches (strong match / possible match badges)
- **Scan history** — every archive photo examined is logged with its match score;
  re-evaluate any batch when you add new reference photos
- **Research Board** — save photos to a persistent sidebar
- **Markdown export** — download saved photos as a formatted research report

---

## Development

```
npm run dev      # Express (port 3001) + Vite dev server (port 5173) together
npm run build    # Build React app into /public (for production)
npm start        # Serve production build on port 3001
```

---

## Project Structure

```
.
├── server.js               # Express entry point
├── routes/
│   ├── search.js           # GET /api/search?q=...
│   ├── board.js            # GET/POST/DELETE /api/board + export
│   ├── faces.js            # GET/POST/DELETE /api/faces/reference + history
│   └── imageProxy.js       # GET /api/proxy-image?url=... (CORS proxy)
├── services/
│   ├── nara.js             # NARA Catalog API
│   ├── loc.js              # Library of Congress Pictures API
│   ├── wikimedia.js        # Wikimedia Commons MediaWiki API
│   └── europeana.js        # Europeana API
├── scripts/
│   └── setup.js            # Run by install:all — creates .env, copies models
├── data/                   # Auto-created; board.json + scan-history.json live here
├── client/                 # Vite + React 18 frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── services/
│   │   │   └── faceRecognition.js   # Browser-side face detection (face-api.js)
│   │   └── components/
│   │       ├── SearchBar.jsx
│   │       ├── SourceStatus.jsx
│   │       ├── PhotoGrid.jsx
│   │       ├── PhotoCard.jsx
│   │       ├── FacePanel.jsx
│   │       └── ResearchBoard.jsx
│   ├── public/models/      # Face-api model weights (copied by setup.js)
│   ├── index.html
│   └── vite.config.js
├── .env.example
└── package.json
```

---

## Subject Context

| Field | Detail |
|---|---|
| Name | Herbert Henry Miller |
| Rank | Private First Class |
| Unit | Company H, 120th Infantry Regiment, 30th Infantry Division |
| Serial Number | 35740482 |
| Omaha Beach landing | June 11, 1944 |
| Captured | August 6, 1944 — Mortain, France (Operation Lüttich) |
| German POW Number | 85464 |
| Stalags | XII-A, VII-A (Moosburg), XVIII-C (Markt Pongau) |
| Liberated | May 13, 1945 |
