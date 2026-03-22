import { useState } from 'react';
import { STRONG_MATCH, POSSIBLE_MATCH } from '../services/faceRecognition';

const SOURCE_COLORS = {
  NARA: '#c8a84b',
  LOC: '#6b9ec9',
  Wikimedia: '#5ba65b',
  Europeana: '#c96b6b',
};

function FaceBadge({ scan, isScanning }) {
  if (isScanning) {
    return <span className="face-badge scanning">Scanning…</span>;
  }
  if (!scan) return null;
  if (!scan.faceDetected) return null;

  const score = scan.score;
  if (score === null || score === undefined) return null;
  if (score < STRONG_MATCH) {
    return (
      <span className="face-badge strong-match" title={`Distance: ${score.toFixed(3)}`}>
        Strong match
      </span>
    );
  }
  if (score < POSSIBLE_MATCH) {
    return (
      <span className="face-badge possible-match" title={`Distance: ${score.toFixed(3)}`}>
        Possible match
      </span>
    );
  }
  return null;
}

export default function PhotoCard({ photo, saved, onSave, scanResult, isScanning }) {
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    await onSave(photo);
    setSaving(false);
  }

  const badgeColor = SOURCE_COLORS[photo.source] || '#888';
  const isMatch = scanResult?.isMatch;

  return (
    <article className={`photo-card ${isMatch ? 'face-match' : ''}`}>
      <div className="photo-thumb-wrap">
        {!imgError && photo.thumbnail ? (
          <img
            className="photo-thumb"
            src={photo.thumbnail}
            alt={photo.title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="photo-thumb-placeholder">No image</div>
        )}
        <span className="source-badge" style={{ backgroundColor: badgeColor }}>
          {photo.source}
        </span>
        <FaceBadge scan={scanResult} isScanning={isScanning} />
      </div>

      <div className="photo-info">
        <p className="photo-title" title={photo.title}>
          {photo.title.length > 80 ? photo.title.slice(0, 80) + '…' : photo.title}
        </p>
        {photo.date && <p className="photo-date">{photo.date}</p>}
      </div>

      <div className="photo-actions">
        {photo.originalUrl && (
          <a
            className="photo-link"
            href={photo.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Record ↗
          </a>
        )}
        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={saved || saving}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save to Board'}
        </button>
      </div>
    </article>
  );
}
