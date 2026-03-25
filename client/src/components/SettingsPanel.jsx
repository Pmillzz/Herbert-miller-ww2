import { useState, useEffect } from 'react';

const SOURCES = [
  {
    key: 'NARA_API_KEY',
    label: 'NARA Catalog',
    description: 'National Archives photograph catalog. Free key required since Sept 2023.',
    howTo: 'Email Catalog_API@nara.gov with your name and email to request a read-only key.',
    linkLabel: 'nara.gov API info',
    linkUrl: 'https://www.archives.gov/research/catalog/help/api',
    configurable: true,
  },
  {
    key: 'EUROPEANA_API_KEY',
    label: 'Europeana',
    description: 'European digital heritage collections. Free key required.',
    howTo: null,
    linkLabel: 'Get a free key',
    linkUrl: 'https://apis.europeana.eu/',
    configurable: true,
  },
  {
    key: null,
    label: 'Wikimedia Commons',
    description: 'No API key needed — works out of the box.',
    status: 'ok',
    configurable: false,
  },
  {
    key: null,
    label: 'Library of Congress',
    description: 'loc.gov is blocked by Cloudflare for server-side requests. No key can fix this.',
    status: 'blocked',
    configurable: false,
  },
];

export default function SettingsPanel({ onClose }) {
  const [keys, setKeys] = useState({ NARA_API_KEY: '', EUROPEANA_API_KEY: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setKeys)
      .catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      });
      if (!res.ok) throw new Error('Server error');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
  }

  return (
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={handleKeyDown}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="API Key Settings">
        <div className="settings-header">
          <h2>API Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="settings-body">
          <p className="settings-intro">
            Configure API keys for archive sources. Keys are saved locally on the server and
            take effect immediately — no restart required.
          </p>

          <form onSubmit={handleSave}>
            {SOURCES.map((src) => (
              <div key={src.label} className={`settings-row ${!src.configurable ? 'settings-row-static' : ''}`}>
                <div className="settings-row-header">
                  <span className="settings-source-label">{src.label}</span>
                  {!src.configurable && (
                    <span className={`settings-status-badge ${src.status}`}>
                      {src.status === 'ok' ? 'Working' : 'Unavailable'}
                    </span>
                  )}
                  {src.configurable && (
                    <span className={`settings-status-badge ${keys[src.key] ? 'configured' : 'not-configured'}`}>
                      {keys[src.key] ? 'Configured' : 'Not set'}
                    </span>
                  )}
                </div>

                <p className="settings-source-desc">{src.description}</p>

                {src.configurable && (
                  <div className="settings-key-row">
                    <div className="settings-input-wrap">
                      <input
                        type={revealed[src.key] ? 'text' : 'password'}
                        className="settings-input"
                        value={keys[src.key] || ''}
                        onChange={(e) => setKeys((k) => ({ ...k, [src.key]: e.target.value }))}
                        placeholder="Paste key here…"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {keys[src.key] && (
                        <button
                          type="button"
                          className="reveal-btn"
                          onClick={() => setRevealed((r) => ({ ...r, [src.key]: !r[src.key] }))}
                          title={revealed[src.key] ? 'Hide' : 'Show'}
                        >
                          {revealed[src.key] ? '🙈' : '👁'}
                        </button>
                      )}
                    </div>
                    {src.howTo && <p className="settings-how-to">{src.howTo}</p>}
                    {src.linkUrl && (
                      <a
                        href={src.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="settings-link"
                      >
                        {src.linkLabel} ↗
                      </a>
                    )}
                  </div>
                )}

                {!src.configurable && src.linkUrl && (
                  <a href={src.linkUrl} target="_blank" rel="noopener noreferrer" className="settings-link">
                    {src.linkLabel} ↗
                  </a>
                )}
              </div>
            ))}

            <div className="settings-footer">
              {error && <span className="settings-error">{error}</span>}
              {saved && <span className="settings-success">Saved — keys active on next search</span>}
              <div className="settings-footer-actions">
                <button type="button" className="settings-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="settings-save-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Keys'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
