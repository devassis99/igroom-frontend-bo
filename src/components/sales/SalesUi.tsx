import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  dueLabel,
  salesApi,
  type DueTone,
  type LeadStatus,
  type RepRef,
  type RepType,
} from "@/lib/sales-api";

/**
 * Small pieces every Sales screen shares, drawn from Backoffice Sales
 * Leads.dc.html (B9a–B9l): the stage badge, the rep avatar (solid for an
 * employee, gold for a commission agent, dashed for the pool), the due
 * label, chips, buttons and cards.
 */

export const STATUS_CLASSES: Record<LeadStatus, { pill: string; dot: string; text: string }> = {
  new: { pill: "bg-bo-neutral-bg text-bo-muted-2", dot: "bg-bo-muted-2", text: "text-bo-muted-2" },
  contacted: { pill: "bg-bo-blue-bg text-bo-blue", dot: "bg-bo-blue", text: "text-bo-blue" },
  demo_booked: { pill: "bg-bo-gold-tint text-bo-gold", dot: "bg-bo-gold", text: "text-bo-gold" },
  demo_done: {
    pill: "bg-bo-purple-bg text-bo-purple",
    dot: "bg-bo-purple",
    text: "text-bo-purple",
  },
  onboarding: { pill: "bg-bo-teal-bg text-bo-teal", dot: "bg-bo-teal", text: "text-bo-teal" },
  live: { pill: "bg-bo-success-bg text-bo-success", dot: "bg-bo-success", text: "text-bo-success" },
  lost: { pill: "bg-bo-danger-bg text-bo-red", dot: "bg-bo-red", text: "text-bo-red" },
  not_now: {
    pill: "bg-bo-closed-bg text-bo-muted-4",
    dot: "bg-bo-muted-5",
    text: "text-bo-muted-4",
  },
};

export function StatusBadge({
  status,
  label,
  size = "md",
}: {
  status: LeadStatus;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-block w-fit whitespace-nowrap rounded-full font-sans font-semibold ${STATUS_CLASSES[status].pill} ${
        size === "sm" ? "px-[7px] py-[2px] text-[10px]" : "px-[9px] py-[3px] text-[11px]"
      }`}
    >
      {label}
    </span>
  );
}

export function RepAvatar({
  rep,
  type,
  initials,
  size = 22,
}: {
  rep?: RepRef | null;
  type?: RepType | null;
  initials?: string;
  size?: number;
}) {
  const kind = rep?.type ?? type ?? null;
  const text = rep?.initials ?? initials ?? "";
  const style =
    kind === "employee"
      ? "bg-bo-dark text-bo-on-dark border border-solid border-bo-dark"
      : kind === "agent"
        ? "bg-bo-gold-tint text-bo-gold border border-solid border-bo-gold-soft"
        : "border border-dashed border-bo-muted-5 text-bo-muted-5";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-sans font-semibold ${style}`}
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.36)) }}
      title={
        rep
          ? `${rep.name} · ${rep.type === "agent" ? "Commission agent" : "Employee"}`
          : kind
            ? undefined
            : "Unassigned pool"
      }
      aria-hidden={!rep}
    >
      {kind ? text : ""}
    </span>
  );
}

export const DUE_CLASSES: Record<DueTone, string> = {
  overdue: "text-bo-red",
  today: "text-bo-gold",
  soon: "text-bo-muted-4",
  none: "text-bo-muted-5",
};

export function DueText({
  at,
  className = "",
  long = false,
}: {
  at: string | null;
  className?: string;
  /** "Today 3:00 PM" rather than "3:00 PM" — for a card that doesn't sit under a "Due today" heading. */
  long?: boolean;
}) {
  const due = dueLabel(at, new Date(), { long });
  return (
    <span className={`font-sans text-xs font-semibold ${DUE_CLASSES[due.tone]} ${className}`}>
      {due.text}
    </span>
  );
}

export const primaryButtonClass =
  "rounded-[10px] bg-bo-dark px-4 py-2.5 font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-[13px] font-medium text-bo-ink-soft disabled:cursor-not-allowed disabled:opacity-50";
export const smallButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-bo-input-border bg-bo-surface px-2.5 py-1.5 font-sans text-xs font-medium text-bo-ink-soft disabled:cursor-not-allowed disabled:opacity-40";
export const linkButtonClass =
  "font-sans text-xs font-semibold text-bo-gold hover:underline disabled:opacity-50";
export const inputClass =
  "w-full rounded-[10px] border border-bo-input-border bg-bo-surface px-3 py-2.5 font-sans text-sm text-bo-ink outline-none focus:border-bo-gold focus:ring-1 focus:ring-bo-gold";
export const selectClass =
  "rounded-lg border border-bo-input-border bg-bo-surface px-3 py-2 font-sans text-xs font-medium text-bo-ink-soft outline-none focus:border-bo-gold";
export const labelClass =
  "font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-bo-muted-1";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[14px] border border-bo-border bg-bo-surface ${className}`}>
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 font-sans text-xs ${
        active
          ? "border border-bo-dark bg-bo-dark font-semibold text-bo-on-dark"
          : "border border-bo-input-border bg-transparent font-medium text-bo-ink-soft hover:border-bo-muted-5"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  full,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  full?: boolean;
}) {
  return (
    <div
      className={`flex rounded-[10px] bg-bo-page p-[3px] ${full ? "w-full" : ""}`}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${full ? "flex-1" : ""} rounded-lg px-3.5 py-[7px] font-sans text-xs ${
            value === o.value
              ? "bg-bo-surface font-semibold text-bo-ink shadow-[0_1px_3px_rgba(20,15,5,0.12)]"
              : "font-medium text-bo-muted-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex w-fit items-center overflow-hidden rounded-[10px] border border-bo-input-border">
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-10 w-11 font-sans text-base text-bo-muted-2 disabled:opacity-40"
        disabled={value <= min}
      >
        −
      </button>
      <span
        className="flex h-10 w-12 items-center justify-center border-x border-bo-sidebar-border font-sans text-sm font-semibold text-bo-ink"
        aria-live="polite"
        aria-label={`${value} ${label}`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`More ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-10 w-11 font-sans text-base text-bo-muted-2 disabled:opacity-40"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

export function ErrorNote({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="m-0 rounded-[10px] bg-bo-danger-bg px-3 py-2 font-sans text-xs font-medium text-bo-red"
    >
      {error instanceof Error ? error.message : fallback}
    </p>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 mb-1 font-sans text-2xl font-semibold text-bo-ink">{title}</h1>
        {subtitle && <p className="m-0 font-sans text-[13px] text-bo-muted-4">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** A loading line that doesn't jump the layout. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="m-0 py-6 text-center font-sans text-sm text-bo-muted-5">{label}</p>;
}

/** Who the caller is to sales — permissions, rep profile, cities, reps and vocab. Cached for the session. */
export function useSalesMe() {
  return useQuery({ queryKey: ["sales", "me"], queryFn: salesApi.me, staleTime: 5 * 60_000 });
}

/** The "density" bar — live shops toward the Explore threshold, onboarding shops after them. */
export function DensityMeter({
  live,
  onboarding,
  unlockAt,
  height = 10,
}: {
  live: number;
  onboarding: number;
  unlockAt: number;
  height?: number;
}) {
  const segments = Math.max(unlockAt, 1);
  return (
    <div className="flex gap-1">
      <span className="sr-only">{`${live} of ${unlockAt} live shops, ${onboarding} onboarding`}</span>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`flex-1 rounded-[3px] ${
            i < live
              ? "bg-[oklch(55%_0.13_145)]"
              : i < live + onboarding
                ? "bg-[oklch(55%_0.08_200/0.4)]"
                : "bg-bo-border-soft"
          }`}
          style={{ height }}
        />
      ))}
    </div>
  );
}

export function ExplorePill({ on }: { on: boolean }) {
  return (
    <span
      className={`rounded-full px-[9px] py-[3px] font-sans text-[11px] font-semibold ${
        on ? "bg-bo-success-bg text-bo-success" : "bg-bo-neutral-bg text-bo-muted-4"
      }`}
    >
      {on ? "Explore on" : "Explore off"}
    </span>
  );
}

/** "3 more live shops to turn on Explore." */
export function densityLine(d: {
  liveShops: number;
  unlockAt: number;
  remaining: number;
  exploreOn: boolean;
  cityName: string;
}) {
  if (d.exploreOn) return `Explore is on for ${d.cityName}.`;
  return `${d.remaining} more live shop${d.remaining === 1 ? "" : "s"} to turn on Explore.`;
}
