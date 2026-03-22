export default function ResearchBoard({ photos, onRemove, onClose }) {
  function handleExport() {
    window.open('/api/board/export', '_blank');
  }

  return (
    <aside className="research-board">
      <div className="board-header">
        <h2>Research Board</h2>
        <div className="board-header-actions">
          <button className="export-btn" onClick={handleExport} disabled={photos.length === 0}>
            Export Markdown
          </button>
          <button className="close-btn" onClick={onClose} aria-label="Close board">
            ✕
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="board-empty">
          <p>No photographs saved yet.</p>
          <p>Click "Save to Board" on any result to pin it here.</p>
        </div>
      ) : (
        <ul className="board-list">
          {photos.map((photo) => (
            <li key={photo.id} className="board-item">
              {photo.thumbnail && (
                <img
                  className="board-thumb"
                  src={photo.thumbnail}
                  alt={photo.title}
                  loading="lazy"
                />
              )}
              <div className="board-item-info">
                <p className="board-item-title">
                  {photo.title.length > 60 ? photo.title.slice(0, 60) + '…' : photo.title}
                </p>
                <p className="board-item-meta">
                  {photo.source}{photo.date ? ` · ${photo.date}` : ''}
                </p>
                {photo.originalUrl && (
                  <a
                    className="board-item-link"
                    href={photo.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Record ↗
                  </a>
                )}
              </div>
              <button
                className="board-remove-btn"
                onClick={() => onRemove(photo.id)}
                aria-label="Remove from board"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
