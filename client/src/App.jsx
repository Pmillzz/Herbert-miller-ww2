import { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from './components/SearchBar';
import SourceStatus from './components/SourceStatus';
import PhotoGrid from './components/PhotoGrid';
import ResearchBoard from './components/ResearchBoard';
import FacePanel from './components/FacePanel';
import SettingsPanel from './components/SettingsPanel';
import {
  loadModels,
  isModelsLoaded,
  extractDescriptor,
  findBestMatch,
  POSSIBLE_MATCH,
} from './services/faceRecognition';

const INITIAL_STATUS = {
  nara: { count: 0, error: null, loading: false },
  loc: { count: 0, error: null, loading: false },
  wikimedia: { count: 0, error: null, loading: false },
  europeana: { count: 0, error: null, loading: false },
};

export default function App() {
  // ── Search state ───────────────────────────────────────────────
  const [results, setResults] = useState([]);
  const [sourceStatus, setSourceStatus] = useState(INITIAL_STATUS);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  // ── Settings ───────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Research board ─────────────────────────────────────────────
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [boardOpen, setBoardOpen] = useState(false);

  // ── Face ID ────────────────────────────────────────────────────
  const [facePanelOpen, setFacePanelOpen] = useState(false);
  const [referencePhotos, setReferencePhotos] = useState([]); // full ref objects
  const refDescriptors = useRef([]); // [{id, descriptor}] — kept in sync with referencePhotos

  // scanResults: { [photoId]: { score, isMatch, faceDetected, scannedAt,
  //                             referenceIds, thumbnailUrl, source, title, originalUrl } }
  const [scanResults, setScanResults] = useState({});
  const [modelsStatus, setModelsStatus] = useState('idle'); // idle|loading|ready|error
  const [autoScan, setAutoScan] = useState(true);
  const [currentlyScanningId, setCurrentlyScanningId] = useState(null);

  const scanQueueRef = useRef([]);
  const scanRunningRef = useRef(false);

  // ── On mount: load saved board, reference faces, and history ───
  useEffect(() => {
    fetch('/api/board')
      .then((r) => r.json())
      .then(setSavedPhotos)
      .catch(console.error);

    fetch('/api/faces/reference')
      .then((r) => r.json())
      .then((refs) => {
        setReferencePhotos(refs);
        refDescriptors.current = refs.map((r) => ({ id: r.id, descriptor: r.descriptor }));
      })
      .catch(console.error);

    fetch('/api/faces/history')
      .then((r) => r.json())
      .then((history) => {
        const map = {};
        for (const h of history) {
          map[h.photoId] = {
            score: h.matchScore,
            isMatch: h.isMatch,
            faceDetected: h.faceDetected,
            scannedAt: h.scannedAt,
            referenceIds: h.referenceIds || [],
            thumbnailUrl: h.thumbnailUrl,
            source: h.source,
            title: h.title,
            originalUrl: h.originalUrl,
          };
        }
        setScanResults(map);
      })
      .catch(console.error);
  }, []);

  // ── Load face models ───────────────────────────────────────────
  const handleLoadModels = useCallback(async () => {
    if (isModelsLoaded()) { setModelsStatus('ready'); return; }
    setModelsStatus('loading');
    try {
      await loadModels();
      setModelsStatus('ready');
    } catch (err) {
      console.error('Model load failed:', err);
      setModelsStatus('error');
    }
  }, []);

  // Auto-load models when face panel opens for the first time
  useEffect(() => {
    if (facePanelOpen && modelsStatus === 'idle') {
      handleLoadModels();
    }
  }, [facePanelOpen, modelsStatus, handleLoadModels]);

  // ── Scan queue processing ──────────────────────────────────────
  const processScanQueue = useCallback(async () => {
    if (scanRunningRef.current) return;
    scanRunningRef.current = true;

    while (scanQueueRef.current.length > 0) {
      const photo = scanQueueRef.current.shift();
      if (!photo?.thumbnail) continue;

      setCurrentlyScanningId(photo.id);

      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(photo.thumbnail)}`;
      let descriptor = null;

      try {
        descriptor = await extractDescriptor(proxyUrl);
      } catch {
        // image load failed or no face — treat as no-face
      }

      const currentRefIds = refDescriptors.current.map((r) => r.id);
      let result;

      if (!descriptor) {
        result = {
          score: null,
          isMatch: false,
          faceDetected: false,
          referenceIds: currentRefIds,
          thumbnailUrl: photo.thumbnail,
          source: photo.source,
          title: photo.title,
          originalUrl: photo.originalUrl,
        };
      } else {
        const { score } = findBestMatch(descriptor, refDescriptors.current);
        result = {
          score,
          isMatch: score < POSSIBLE_MATCH,
          faceDetected: true,
          referenceIds: currentRefIds,
          thumbnailUrl: photo.thumbnail,
          source: photo.source,
          title: photo.title,
          originalUrl: photo.originalUrl,
        };
      }

      // Update local state
      setScanResults((prev) => ({ ...prev, [photo.id]: result }));

      // Persist to server
      fetch('/api/faces/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.id,
          matchScore: result.score,
          ...result,
        }),
      }).catch(console.error);
    }

    setCurrentlyScanningId(null);
    scanRunningRef.current = false;
  }, []);

  function enqueueForScan(photos) {
    if (!isModelsLoaded() || refDescriptors.current.length === 0) return;

    const currentRefKey = refDescriptors.current
      .map((r) => r.id)
      .sort()
      .join(',');

    const toScan = photos.filter((p) => {
      if (!p.thumbnail) return false;
      const existing = scanResults[p.id];
      if (!existing) return true;
      // Rescan if reference set has changed
      const existingRefKey = (existing.referenceIds || []).sort().join(',');
      return existingRefKey !== currentRefKey;
    });

    if (toScan.length === 0) return;
    scanQueueRef.current.push(...toScan);
    processScanQueue();
  }

  // ── Search ─────────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (query) => {
      if (!query.trim()) return;
      setLastQuery(query);
      setLoading(true);
      setResults([]);
      setSourceStatus({
        nara: { count: 0, error: null, loading: true },
        loc: { count: 0, error: null, loading: true },
        wikimedia: { count: 0, error: null, loading: true },
        europeana: { count: 0, error: null, loading: true },
      });

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        setResults(data.results || []);
        setSourceStatus({
          nara: { ...(data.status?.nara || { count: 0, error: null }), loading: false },
          loc: { ...(data.status?.loc || { count: 0, error: null }), loading: false },
          wikimedia: { ...(data.status?.wikimedia || { count: 0, error: null }), loading: false },
          europeana: { ...(data.status?.europeana || { count: 0, error: null }), loading: false },
        });

        // Auto-scan results if face ID is ready
        if (autoScan && isModelsLoaded() && refDescriptors.current.length > 0) {
          enqueueForScan(data.results || []);
        }
      } catch {
        setSourceStatus({
          nara: { count: 0, error: 'Network error', loading: false },
          loc: { count: 0, error: 'Network error', loading: false },
          wikimedia: { count: 0, error: 'Network error', loading: false },
          europeana: { count: 0, error: 'Network error', loading: false },
        });
      } finally {
        setLoading(false);
      }
    },
    [autoScan, processScanQueue]
  );

  // ── Research board callbacks ───────────────────────────────────
  const handleSave = useCallback(async (photo) => {
    const res = await fetch('/api/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo),
    });
    if (res.ok) {
      const saved = await res.json();
      setSavedPhotos((prev) => [...prev, saved]);
    }
  }, []);

  const handleRemove = useCallback(async (photoId) => {
    await fetch(`/api/board/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
    setSavedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  // ── Face ID callbacks ──────────────────────────────────────────
  const handleReferenceAdded = useCallback(
    (entry) => {
      setReferencePhotos((prev) => [...prev, entry]);
      refDescriptors.current = [
        ...refDescriptors.current,
        { id: entry.id, descriptor: entry.descriptor },
      ];
      // Re-scan current results with the new reference included
      if (autoScan && isModelsLoaded() && results.length > 0) {
        enqueueForScan(results);
      }
    },
    [autoScan, results, processScanQueue]
  );

  const handleReferenceDeleted = useCallback(async (id) => {
    await fetch(`/api/faces/reference/${id}`, { method: 'DELETE' });
    setReferencePhotos((prev) => prev.filter((r) => r.id !== id));
    refDescriptors.current = refDescriptors.current.filter((r) => r.id !== id);
  }, []);

  // Re-scan all photos in history that are outdated (called from FacePanel)
  const handleRescanHistory = useCallback(async () => {
    if (!isModelsLoaded() || refDescriptors.current.length === 0) return;
    const history = await fetch('/api/faces/history').then((r) => r.json());
    const currentRefKey = refDescriptors.current
      .map((r) => r.id)
      .sort()
      .join(',');

    const outdated = history
      .filter((h) => {
        const hKey = (h.referenceIds || []).sort().join(',');
        return hKey !== currentRefKey;
      })
      .map((h) => ({
        id: h.photoId,
        thumbnail: h.thumbnailUrl,
        source: h.source,
        title: h.title,
        originalUrl: h.originalUrl,
      }));

    scanQueueRef.current.push(...outdated);
    processScanQueue();
  }, [processScanQueue]);

  const savedIds = new Set(savedPhotos.map((p) => p.id));
  const hasFaceFeature = referencePhotos.length > 0 && modelsStatus === 'ready';

  return (
    <div
      className={`app ${boardOpen ? 'board-open' : ''} ${facePanelOpen ? 'face-open' : ''}`}
    >
      <header className="site-header">
        <div className="header-inner">
          <div className="header-title">
            <h1>Herbert Miller</h1>
            <p className="header-subtitle">
              Pfc · Company H, 120th Infantry · 30th Infantry Division · U.S. Army
            </p>
          </div>
          <div className="header-actions">
            <button
              className="settings-toggle"
              onClick={() => setSettingsOpen(true)}
              title="API Settings"
              aria-label="Open API settings"
            >
              ⚙
            </button>
            <button
              className={`face-toggle ${facePanelOpen ? 'active' : ''} ${hasFaceFeature ? 'has-refs' : ''}`}
              onClick={() => setFacePanelOpen((v) => !v)}
            >
              Face ID
              {currentlyScanningId && <span className="scanning-dot" />}
              {!currentlyScanningId &&
                Object.values(scanResults).some((r) => r.isMatch) && (
                  <span className="match-dot" />
                )}
            </button>
            <button
              className={`board-toggle ${savedPhotos.length > 0 ? 'has-items' : ''}`}
              onClick={() => setBoardOpen((v) => !v)}
            >
              Research Board
              {savedPhotos.length > 0 && (
                <span className="board-badge">{savedPhotos.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <SearchBar onSearch={handleSearch} loading={loading} />
        <SourceStatus status={sourceStatus} />

        {lastQuery && !loading && results.length === 0 && (
          <div className="empty-state">
            No photographs found for "<strong>{lastQuery}</strong>". Try a different query or
            check source status above.
          </div>
        )}

        {!lastQuery && (
          <div className="welcome">
            <p>
              Search for archival photographs across NARA, Library of Congress, Wikimedia Commons,
              and Europeana simultaneously. Use the preset buttons to start.
            </p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Searching archives…</p>
          </div>
        )}

        {results.length > 0 && (
          <PhotoGrid
            photos={results}
            savedIds={savedIds}
            onSave={handleSave}
            scanResults={scanResults}
            currentlyScanningId={currentlyScanningId}
          />
        )}
      </main>

      {boardOpen && (
        <ResearchBoard
          photos={savedPhotos}
          onRemove={handleRemove}
          onClose={() => setBoardOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}

      {facePanelOpen && (
        <FacePanel
          onClose={() => setFacePanelOpen(false)}
          referencePhotos={referencePhotos}
          onReferenceAdded={handleReferenceAdded}
          onReferenceDeleted={handleReferenceDeleted}
          scanResults={scanResults}
          onRescanHistory={handleRescanHistory}
          modelsStatus={modelsStatus}
          onLoadModels={handleLoadModels}
          autoScan={autoScan}
          onToggleAutoScan={() => setAutoScan((v) => !v)}
        />
      )}
    </div>
  );
}
