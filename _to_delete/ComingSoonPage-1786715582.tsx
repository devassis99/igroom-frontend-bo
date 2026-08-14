interface ComingSoonPageProps {
  title: string;
}

/**
 * Shared placeholder for the sidebar sections Backoffice.dc.html designs
 * (B2–B8) but that don't have a backend endpoint to back them yet —
 * keeps the nav honest (every link goes somewhere real) without faking
 * data for sections nobody asked to build out first.
 */
export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">{title}</h1>
      <div className="rounded-[14px] border border-bo-border bg-bo-surface p-10 text-center">
        <p className="m-0 font-sans text-sm text-bo-muted-3">
          Designed in Backoffice.dc.html — not built out yet.
        </p>
      </div>
    </div>
  );
}

export default ComingSoonPage;
