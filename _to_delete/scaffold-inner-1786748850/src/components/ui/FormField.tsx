import type { ReactNode } from "react";

/** Shared label+control wrapper for modal forms (New Product, Add Price, ...). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export const formInputClass =
  "rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-3 font-sans text-sm text-bo-ink outline-none focus:border-2 focus:border-bo-gold";

export default Field;
