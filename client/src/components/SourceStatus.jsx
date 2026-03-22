const SOURCE_LABELS = {
  nara: 'NARA',
  loc: 'Lib. of Congress',
  wikimedia: 'Wikimedia',
  europeana: 'Europeana',
};

export default function SourceStatus({ status }) {
  const anyActive = Object.values(status).some((s) => s.loading || s.count > 0 || s.error);
  if (!anyActive) return null;

  return (
    <div className="source-status">
      {Object.entries(status).map(([key, s]) => {
        let cls = 'source-chip';
        if (s.loading) cls += ' loading';
        else if (s.error) cls += ' error';
        else if (s.count > 0) cls += ' ok';
        else cls += ' empty';

        return (
          <div key={key} className={cls} title={s.error || undefined}>
            <span className="source-name">{SOURCE_LABELS[key]}</span>
            <span className="source-info">
              {s.loading ? '…' : s.error ? '✗' : `${s.count}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
