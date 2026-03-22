import PhotoCard from './PhotoCard';

export default function PhotoGrid({ photos, savedIds, onSave }) {
  return (
    <section className="photo-grid-section">
      <p className="results-count">{photos.length} photograph{photos.length !== 1 ? 's' : ''} found</p>
      <div className="photo-grid">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            saved={savedIds.has(photo.id)}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}
