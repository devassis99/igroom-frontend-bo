import type { ReactNode } from "react";

const TONE_CLASSES = {
  success: "bg-bo-success-bg text-bo-success",
  danger: "bg-bo-danger-bg text-bo-danger",
  neutral: "bg-bo-neutral-bg text-bo-muted-3",
  gold: "bg-bo-gold-bg text-bo-gold",
} as const;

interface StatusPillProps {
  tone: keyof typeof TONE_CLASSES;
  children: ReactNode;
}

/** Matches the rounded status badge used in every table across Backoffice.dc.html. */
export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={`w-fit rounded-full px-[9px] py-[3px] font-sans text-[11px] font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export default StatusPill;
