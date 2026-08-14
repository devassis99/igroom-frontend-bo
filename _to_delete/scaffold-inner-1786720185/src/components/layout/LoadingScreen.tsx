/** Matches Backoffice.dc.html's B0.6 frame — shown during the silent session bootstrap. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bo-dark">
      <p className="m-0 font-serif text-[34px] font-semibold tracking-wide text-bo-on-dark">
        iGroom <span className="font-sans text-sm font-medium text-bo-page/80">Backoffice</span>
      </p>
      <div
        className="h-9 w-9 rounded-full border-[3px] border-bo-muted-5 border-t-bo-gold-soft"
        style={{ animation: "bo-spin 0.9s linear infinite" }}
      />
      <p className="m-0 font-sans text-xs font-medium tracking-[0.04em] text-bo-page/80">
        LOADING BACKOFFICE
      </p>
    </div>
  );
}

export default LoadingScreen;
