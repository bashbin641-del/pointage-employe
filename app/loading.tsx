export default function Loading() {
  return (
    <main className="route-loading-page" aria-busy="true">
      <span className="compact-data-loader" role="status" aria-live="polite">
        <span className="compact-data-spinner" aria-hidden="true" />
        Chargement des données…
      </span>
    </main>
  );
}
