import { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import SourceStatus from './components/SourceStatus';
import PhotoGrid from './components/PhotoGrid';
import ResearchBoard from './components/ResearchBoard';

const INITIAL_STATUS = {
  nara: { count: 0, error: null, loading: false },
  loc: { count: 0, error: null, loading: false },
  wikimedia: { count: 0, error: null, loading: false },
  europeana: { count: 0, error: null, loading: false },
};

export default function App() {
  const [results, setResults] = useState([]);
  const [sourceStatus, setSourceStatus] = useState(INITIAL_STATUS);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [boardOpen, setBoardOpen] = useState(false);

  // Load saved board on mount
  useEffect(() => {
    fetch('/api/board')
      .then((r) => r.json())
      .then(setSavedPhotos)
      .catch(console.error);
  }, []);

  const handleSearch = useCallback(async (query) => {
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
    } catch (err) {
      setSourceStatus({
        nara: { count: 0, error: 'Network error', loading: false },
        loc: { count: 0, error: 'Network error', loading: false },
        wikimedia: { count: 0, error: 'Network error', loading: false },
        europeana: { count: 0, error: 'Network error', loading: false },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = useCallback(async (photo) => {
    const res = await fetch('/api/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo),
    });
    if (res.ok) {
      const saved = await res.json();
      setSavedPhotos((prev) => [...prev, saved]);
    } else if (res.status === 409) {
      // already saved — silently ignore
    }
  }, []);

  const handleRemove = useCallback(async (photoId) => {
    await fetch(`/api/board/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
    setSavedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  const savedIds = new Set(savedPhotos.map((p) => p.id));

  return (
    <div className={`app ${boardOpen ? 'board-open' : ''}`}>
      <header className="site-header">
        <div className="header-inner">
          <div className="header-title">
            <h1>Herbert Miller</h1>
            <p className="header-subtitle">
              Pfc · Company H, 120th Infantry · 30th Infantry Division · U.S. Army
            </p>
          </div>
          <button
            className={`board-toggle ${savedPhotos.length > 0 ? 'has-items' : ''}`}
            onClick={() => setBoardOpen((v) => !v)}
            aria-label="Toggle Research Board"
          >
            Research Board
            {savedPhotos.length > 0 && (
              <span className="board-badge">{savedPhotos.length}</span>
            )}
          </button>
        </div>
      </header>

      <main className="main-content">
        <SearchBar onSearch={handleSearch} loading={loading} />
        <SourceStatus status={sourceStatus} />

        {lastQuery && !loading && results.length === 0 && (
          <div className="empty-state">
            No photographs found for "<strong>{lastQuery}</strong>". Try a different query or check source status above.
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
          <PhotoGrid photos={results} savedIds={savedIds} onSave={handleSave} />
        )}
      </main>

      {boardOpen && (
        <ResearchBoard
          photos={savedPhotos}
          onRemove={handleRemove}
          onClose={() => setBoardOpen(false)}
        />
      )}
    </div>
  );
}
