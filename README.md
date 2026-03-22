# Herbert Miller — WWII Archival Photo Research Tool

A local web app for researching the WWII service history of **Pfc Herbert Henry Miller**,
Company H, 120th Infantry Regiment, 30th Infantry Division, U.S. Army (Serial No. 35740482).

Searches photographs across four archival sources simultaneously:

| Source | API | Key Required |
|---|---|---|
| National Archives (NARA) | catalog.archives.gov/api/v1 | No |
| Library of Congress | loc.gov/pictures | No |
| Wikimedia Commons | commons.wikimedia.org/w/api.php | No |
| Europeana | api.europeana.eu | Yes (free) |

---

## Setup

### 1. Prerequisites

- Node.js 18+

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your **Europeana API key** (optional — get one free at
https://apis.europeana.eu/). The other three archives require no key.

### 4. Development

Run the Express backend and Vite dev server concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 5. Production build

```bash
npm run build   # builds React → /public
npm start       # serves everything from Express on port 3001
```

---

## Features

- **Unified search** across all four archives with one query
- **Preset buttons** for key research topics:
  - 30th Infantry Division Normandy
  - Mortain 1944 / Operation Lüttich
  - 120th Infantry Regiment
  - Stalag VII-A Moosburg
  - Stalag XVIII-C Markt Pongau
- **Per-source status** — shows result count or error for each archive
- **Photo grid** with thumbnail, source badge, title, date, and link to original record
- **Research Board** — save photos to a persistent sidebar (stored in `data/board.json`)
- **Markdown export** — download saved photos as a formatted research report

---

## Project Structure

```
.
├── server.js               # Express entry point
├── routes/
│   ├── search.js           # GET /api/search?q=...
│   └── board.js            # GET/POST/DELETE /api/board + export
├── services/
│   ├── nara.js             # NARA Catalog API
│   ├── loc.js              # Library of Congress Pictures API
│   ├── wikimedia.js        # Wikimedia Commons MediaWiki API
│   └── europeana.js        # Europeana API
├── data/
│   └── board.json          # Saved photos (git-ignored)
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── components/
│   │       ├── SearchBar.jsx
│   │       ├── SourceStatus.jsx
│   │       ├── PhotoGrid.jsx
│   │       ├── PhotoCard.jsx
│   │       └── ResearchBoard.jsx
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
