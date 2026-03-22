import { useState, useRef, useEffect } from 'react';
import {
  loadModels,
  isModelsLoaded,
  extractDescriptor,
  fileToThumbnail,
  STRONG_MATCH,
  POSSIBLE_MATCH,
} from '../services/faceRecognition';

const MATCH_LABEL = (score) => {
  if (score === null || score === undefined) return null;
  if (score < STRONG_MATCH) return { label: 'Strong match', cls: 'match-strong' };
  if (score < POSSIBLE_MATCH) return { label: 'Possible match', cls: 'match-possible' };
  return null;
};

export default function FacePanel({
  onClose,
  referencePhotos,      // [{id, filename, thumbnail, uploadedAt, descriptor}]
  onReferenceAdded,     // (entry) => void
  onReferenceDeleted,   // (id) => void
  scanResults,          // { [photoId]: {score, isMatch, faceDetected, scannedAt, referenceIds} }
  onRescanHistory,      // () => void — triggers re-scan of outdated history entries
  modelsStatus,         // 'idle' | 'loading' | 'ready' | 'error'
  onLoadModels,         // () => void
  autoScan,
  onToggleAutoScan,
}) {
  const [tab, setTab] = useState('references'); // 'references' | 'history'
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'matches' | 'faces'
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  // Load stats on mount and whenever scan results change
  useEffect(() => {
    fetch('/api/faces/history/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [scanResults]);

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);

    // Ensure models are loaded before extracting descriptors
    if (!isModelsLoaded()) {
      try {
        await loadModels();
      } catch (err) {
        setUploadError('Failed to load face detection models: ' + err.message);
        setUploading(false);
        return;
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const thumbnail = await fileToThumbnail(file);

        // Load full-size version for face detection
        const img = await loadFileAsImage(file);
        const descriptor = await extractDescriptor(img);

        if (!descriptor) {
          failCount++;
          continue;
        }

        const res = await fetch('/api/faces/reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, thumbnail, descriptor }),
        });

        if (res.ok) {
          const entry = await res.json();
          onReferenceAdded(entry);
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount === 0 && failCount > 0) {
      setUploadError(
        `No faces detected in ${failCount} photo${failCount > 1 ? 's' : ''}. ` +
          'Make sure Herbert is clearly visible and facing the camera.'
      );
    } else if (failCount > 0) {
      setUploadError(
        `Added ${successCount} photo${successCount > 1 ? 's' : ''}. ` +
          `${failCount} photo${failCount > 1 ? 's' : ''} had no detectable face.`
      );
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Build history list from scanResults (client-side state, already sorted by score)
  const historyEntries = Object.entries(scanResults)
    .map(([photoId, r]) => ({ photoId, ...r }))
    .filter((h) => {
      if (historyFilter === 'matches') return h.isMatch;
      if (historyFilter === 'faces') return h.faceDetected;
      return true;
    })
    .sort((a, b) => {
      if (a.matchScore === null || a.matchScore === undefined) return 1;
      if (b.matchScore === null || b.matchScore === undefined) return -1;
      return a.matchScore - b.matchScore;
    });

  return (
    <aside className="face-panel">
      <div className="face-panel-header">
        <h2>Face ID</h2>
        <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Model status bar */}
      <div className={`models-bar models-${modelsStatus}`}>
        {modelsStatus === 'idle' && (
          <>
            <span>Face detection models not loaded.</span>
            <button className="models-load-btn" onClick={onLoadModels}>Load now</button>
          </>
        )}
        {modelsStatus === 'loading' && <span>Loading face detection models…</span>}
        {modelsStatus === 'ready' && (
          <span>
            ✓ Ready · Auto-scan{' '}
            <button
              className={`toggle-btn ${autoScan ? 'on' : 'off'}`}
              onClick={onToggleAutoScan}
            >
              {autoScan ? 'ON' : 'OFF'}
            </button>
          </span>
        )}
        {modelsStatus === 'error' && (
          <span className="models-error">Failed to load models. Check console.</span>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="face-stats">
          <div className="face-stat">
            <span className="face-stat-n">{stats.total}</span>
            <span className="face-stat-l">scanned</span>
          </div>
          <div className="face-stat">
            <span className="face-stat-n">{stats.withFace}</span>
            <span className="face-stat-l">faces found</span>
          </div>
          <div className="face-stat match">
            <span className="face-stat-n">{stats.matches}</span>
            <span className="face-stat-l">potential matches</span>
          </div>
          {stats.needsRescan > 0 && (
            <div className="face-stat rescan">
              <span className="face-stat-n">{stats.needsRescan}</span>
              <span className="face-stat-l">outdated</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="face-tabs">
        <button
          className={`face-tab ${tab === 'references' ? 'active' : ''}`}
          onClick={() => setTab('references')}
        >
          Reference Photos ({referencePhotos.length})
        </button>
        <button
          className={`face-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Scan History ({Object.keys(scanResults).length})
        </button>
      </div>

      {/* ── References tab ── */}
      {tab === 'references' && (
        <div className="face-tab-content">
          <div className="ref-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || modelsStatus === 'loading'}
            >
              {uploading ? 'Processing…' : '+ Upload photos of Herbert'}
            </button>
            <p className="upload-hint">
              Upload any clear photos of your grandfather. Face detection runs locally — photos
              never leave your machine.
            </p>
            {uploadError && <p className="upload-error">{uploadError}</p>}
          </div>

          {referencePhotos.length === 0 ? (
            <div className="ref-empty">
              <p>No reference photos yet.</p>
              <p>Upload one or more photos of Herbert to begin facial recognition scanning.</p>
            </div>
          ) : (
            <ul className="ref-list">
              {referencePhotos.map((ref) => (
                <li key={ref.id} className="ref-item">
                  {ref.thumbnail ? (
                    <img className="ref-thumb" src={ref.thumbnail} alt={ref.filename} />
                  ) : (
                    <div className="ref-thumb ref-thumb-placeholder">?</div>
                  )}
                  <div className="ref-info">
                    <p className="ref-filename">{ref.filename}</p>
                    <p className="ref-date">
                      Added {new Date(ref.uploadedAt).toLocaleDateString('en-US')}
                    </p>
                  </div>
                  <button
                    className="ref-delete-btn"
                    onClick={() => onReferenceDeleted(ref.id)}
                    aria-label="Remove reference photo"
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <div className="face-tab-content">
          <div className="history-toolbar">
            <div className="history-filters">
              {['all', 'matches', 'faces'].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${historyFilter === f ? 'active' : ''}`}
                  onClick={() => setHistoryFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'matches' ? 'Matches only' : 'Faces found'}
                </button>
              ))}
            </div>
            <div className="history-actions">
              {stats?.needsRescan > 0 && (
                <button className="rescan-btn" onClick={onRescanHistory}>
                  Re-scan outdated ({stats.needsRescan})
                </button>
              )}
              <button
                className="clear-btn"
                onClick={async () => {
                  if (!confirm('Clear all scan history?')) return;
                  await fetch('/api/faces/history', { method: 'DELETE' });
                  setStats((s) => s ? { ...s, total: 0, withFace: 0, matches: 0, needsRescan: 0 } : s);
                }}
              >
                Clear all
              </button>
            </div>
          </div>

          {historyEntries.length === 0 ? (
            <div className="history-empty">
              <p>No scan history yet.</p>
              <p>Upload reference photos and run a search to begin.</p>
            </div>
          ) : (
            <ul className="history-list">
              {historyEntries.map((h) => {
                const matchInfo = MATCH_LABEL(h.matchScore ?? h.score);
                return (
                  <li key={h.photoId} className={`history-item ${h.isMatch ? 'is-match' : ''}`}>
                    {h.thumbnailUrl && (
                      <img
                        className="history-thumb"
                        src={`/api/proxy-image?url=${encodeURIComponent(h.thumbnailUrl)}`}
                        alt={h.title || ''}
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="history-info">
                      <p className="history-title">
                        {(h.title || 'Untitled').slice(0, 55)}
                        {(h.title || '').length > 55 ? '…' : ''}
                      </p>
                      <p className="history-meta">
                        {h.source}
                        {h.scannedAt
                          ? ` · ${new Date(h.scannedAt).toLocaleDateString('en-US')}`
                          : ''}
                      </p>
                      <div className="history-score-row">
                        {h.faceDetected ? (
                          <>
                            <span className="score-pill">
                              dist {typeof h.matchScore === 'number'
                                ? h.matchScore.toFixed(3)
                                : (typeof h.score === 'number' ? h.score.toFixed(3) : '—')}
                            </span>
                            {matchInfo && (
                              <span className={`match-pill ${matchInfo.cls}`}>
                                {matchInfo.label}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="no-face-pill">No face detected</span>
                        )}
                      </div>
                    </div>
                    {h.originalUrl && (
                      <a
                        className="history-link"
                        href={h.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View original record"
                      >
                        ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load file')); };
    img.src = url;
  });
}
