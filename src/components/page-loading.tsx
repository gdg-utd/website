import { PageStateShell } from "./page-state-shell";

export function PageLoading({ label = "Loading page…", embedded = false }: { label?: string; embedded?: boolean }) {
  return (
    <PageStateShell embedded={embedded}>
      <div role="status" aria-live="polite" aria-busy="true">
        <p className="section-label">GDG UTDallas</p>
        <h1>{label}</h1>
        <p>Please wait a moment.</p>
        <div className="page-loading-skeleton" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </PageStateShell>
  );
}
