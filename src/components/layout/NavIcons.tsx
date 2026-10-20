/**
 * Outline icons for the back office sidebar and the phone's Sales tab bar.
 *
 * Same family as the tenant app's sidebar (24px grid, 1.75 stroke, round
 * caps), so the two products feel like one. Every icon takes its colour
 * from the text around it via `currentColor`: the active row's light text
 * makes a light icon, with no separate active variant.
 */
import type { ComponentType } from "react";

export type NavIconComponent = ComponentType<{ className?: string }>;

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

/** Four tiles of different sizes: a dashboard, which is what Overview is. */
export function OverviewIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/** Bell: the page counts the SMS, WhatsApp and email notifications shops send. */
export function UsageIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/** Shopfront with an awning and a door: the businesses on the platform. */
export function ShopsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M2.5 10 4.5 4h15l2 6z" />
      <path d="M4 10v10h16V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/** A ticked box above an open one: the calls and visits due today. */
export function TodayIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="m3 6.5 2 2 4-4" />
      <rect x="3" y="14" width="6" height="6" rx="1" />
      <path d="M13 6.5h8" />
      <path d="M13 17h8" />
    </svg>
  );
}

/** Funnel: leads narrowing down to signed shops. */
export function PipelineIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
    </svg>
  );
}

/** Folded paper map. */
export function MapIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
      <path d="M9 4v13.5" />
      <path d="M15 6.5V20" />
    </svg>
  );
}

/** Two people: the sales team. */
export function RepsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Three rising bars, the same glyph as Analytics in the tenant app. */
export function StatsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} strokeWidth={2.5} className={className}>
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  );
}

/** Stacked layers: subscription tiers. */
export function PlansIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 3 2.5 7.5 12 12l9.5-4.5z" />
      <path d="m2.5 12 9.5 4.5 9.5-4.5" />
      <path d="m2.5 16.5 9.5 4.5 9.5-4.5" />
    </svg>
  );
}

/** Card: subscriptions, invoices and failed payments. */
export function BillingIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  );
}

/** Calendar, the same glyph as Calendar in the tenant app. */
export function BookingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/** Lifebuoy: someone asked for help. */
export function SupportIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m5.6 5.6 3.9 3.9" />
      <path d="m14.5 14.5 3.9 3.9" />
      <path d="m14.5 9.5 3.9-3.9" />
      <path d="m5.6 18.4 3.9-3.9" />
    </svg>
  );
}

/** Gift box: referral rewards. */
export function ReferralsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

/**
 * A person inside a shield: back office staff and what their roles let them
 * do. Kept apart from RepsIcon's two people, so the two people-shaped rows
 * don't look alike.
 */
export function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="9.5" r="2.5" />
      <path d="M8.5 16a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

export function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** A person in a circle: the rep's own page on the phone tab bar. */
export function MeIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5a6.5 6.5 0 0 1 11 0" />
    </svg>
  );
}

export function LogOutIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/** Panel with a divider near the left edge: the same collapse/expand icon as the tenant app. */
export function SidebarToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
