import { useState } from 'react';

const SOURCE_COLORS = {
  NARA: '#c8a84b',
  LOC: '#6b9ec9',
  Wikimedia: '#5ba65b',
  Europeana: '#c96b6b',
};

export default function PhotoCard({ photo, saved, onSave }) {
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    await onSave(photo);
    setSaving(false);
  }

  const badgeColor = SOURCE_COLORS[photo.source] || '#888';

  return (
    <article className="photo-card">
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
