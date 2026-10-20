import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 248;
const GAP = 8;
// Same motion as the dropdowns (bo-popover-in/out in index.css).
const OPEN_MS = 150;
const CLOSE_MS = 120;

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function PersonIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left font-sans text-[14px] font-medium outline-none hover:bg-bo-page focus-visible:bg-bo-page ${
        danger ? "text-bo-danger" : "text-bo-ink-soft"
      }`}
    >
      <span className={`flex shrink-0 ${danger ? "text-bo-danger" : "text-bo-muted-5"}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

/**
 * The menu behind the name at the bottom of the sidebar — the back office
 * version of the tenant app's AccountMenu: who you're signed in as, then
 * My Account, Settings and Log out. Log out used to be a bare line under
 * the name; it lives here now, one deliberate click away.
 *
 * Portaled and `position: fixed`, measured from the trigger, because the
 * sidebar clips horizontally (its collapse transition) and this menu is
 * wider than the collapsed rail. Opens upward, since the trigger sits at
 * the bottom of the screen. Arrow keys move between the rows; Escape
 * closes it and hands focus back to the trigger.
 */
export function AccountMenu({
  open,
  onClose,
  anchorRef,
  name,
  email,
  subtitle,
  onMyAccount,
  onSettings,
  onLogOut,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  name: string;
  email: string | undefined;
  subtitle: string | null;
  onMyAccount: () => void;
  onSettings: () => void;
  onLogOut: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  // Kept mounted for the closing animation, like Select.
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  if (open && (!mounted || closing)) {
    setMounted(true);
    setClosing(false);
  }
  if (!open && mounted && !closing) {
    setClosing(true);
  }

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useLayoutEffect(() => {
    if (!mounted || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - 12),
      bottom: window.innerHeight - rect.top + GAP,
    });
  }, [mounted, anchorRef]);

  // Focus the first row on open, so the arrow keys work straight away.
  useEffect(() => {
    if (!open || !position) return;
    rootRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose, anchorRef]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      (e.key === "Home" ? items[0] : items.at(-1))?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      // Stops a modal's own Escape handler too, though none is open here.
      e.stopPropagation();
      onClose();
      anchorRef.current?.focus();
    }
  }

  if (!mounted || !position) return null;

  return createPortal(
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- an ARIA menu of actions, not a <menu> list of commands.
    <div
      ref={rootRef}
      role="menu"
      aria-label="Account menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`fixed z-[60] overflow-hidden rounded-2xl border border-bo-border bg-bo-surface ${closing ? "pointer-events-none" : ""}`}
      style={{
        left: position.left,
        bottom: position.bottom,
        width: MENU_WIDTH,
        transformOrigin: "bottom left",
        boxShadow: "0 20px 45px -15px rgba(20,15,5,0.35)",
        animation: closing
          ? `bo-popover-out ${CLOSE_MS}ms ease-in forwards`
          : `bo-popover-in ${OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <p className="m-0 truncate font-sans text-sm font-semibold text-bo-ink">{name}</p>
        {email && email !== name && (
          <p className="m-0 mt-0.5 truncate font-sans text-xs text-bo-muted-5">{email}</p>
        )}
        {subtitle && (
          <p className="m-0 mt-2 inline-block rounded-full bg-bo-gold-bg px-2 py-0.5 font-sans text-[11px] font-semibold text-bo-gold">
            {subtitle}
          </p>
        )}
      </div>
      <div className="border-t border-bo-border-soft p-1.5">
        <MenuRow icon={<PersonIcon />} label="My account" onClick={onMyAccount} />
        <MenuRow icon={<GearIcon />} label="Settings" onClick={onSettings} />
      </div>
      <div className="border-t border-bo-border-soft p-1.5">
        <MenuRow icon={<LogOutIcon />} label="Log out" onClick={onLogOut} danger />
      </div>
    </div>,
    document.body,
  );
}

export default AccountMenu;
