import { useState } from 'react';

const PRESETS = [
  '30th Infantry Division Normandy',
  'Mortain 1944',
  'Operation Lüttich',
  '120th Infantry Regiment',
  'Stalag VII-A Moosburg',
  'Stalag XVIII-C Markt Pongau',
];

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState('');

  function submit(q) {
    const query = q ?? value;
    if (!query.trim()) return;
    setValue(query);
    onSearch(query);
  }

  return (
    <div className="search-section">
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className="search-input"
          type="text"
          placeholder="Search archival photographs…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
        />
        <button className="search-btn" type="submit" disabled={loading || !value.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="presets">
        <span className="presets-label">Quick search:</span>
        <div className="preset-buttons">
          {PRESETS.map((p) => (
            <button
              key={p}
              className="preset-btn"
              onClick={() => submit(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
