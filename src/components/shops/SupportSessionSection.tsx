import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/StatusPill";
import { Field, formInputClass } from "@/components/ui/FormField";
import { useAuthStore } from "@/auth/auth-store";
import {
  supportSessionsApi,
  SUPPORT_SESSION_STATE_LABEL,
  SUPPORT_SESSION_STATE_TONE,
  type StartedSupportSession,
} from "@/lib/support-sessions-api";
import type { ShopStaff } from "@/lib/shops-api";

const cancelButtonClass =
  "rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft";
const submitButtonClass =
  "rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Deliberately not auto-opened with window.open(): the call would happen
 * after an await, which popup blockers treat as un-gestured and silently
 * swallow — and because the ticket is single-use, an auto-open that
 * *succeeds* plus an operator who also clicks the link burns the ticket
 * and lands them on an error. One link, one click, one redemption.
 */
function ReadyState({ started, onClose }: { started: StartedSupportSession; onClose: () => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-1.5 rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          SIGNING IN AS
        </span>
        <span className="font-sans text-sm font-semibold text-bo-ink">
          {started.staffUser.name}
          {started.staffUser.isOwner && (
            <span className="ml-1.5 font-sans text-[10px] font-medium text-bo-muted-5">
              (owner)
            </span>
          )}
        </span>
        <span className="font-sans text-[11px] text-bo-muted-5">
          {started.staffUser.email}
          {started.staffUser.roleName && ` · ${started.staffUser.roleName}`}
        </span>
      </div>

      <p className="m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
        This link works <strong className="font-semibold text-bo-ink-soft">once</strong> and expires
        about a minute after it was created. The session itself is read-only and lasts until{" "}
        {formatDateTime(started.expiresAt)} — you can end it sooner from the bar inside the shop's
        app, or from the list below.
      </p>

      <a
        href={started.redeemUrl}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() => setOpened(true)}
        className="rounded-[10px] bg-bo-dark px-[18px] py-[11px] text-center font-sans text-[13px] font-semibold text-bo-on-dark"
      >
        Open {started.shopName} ↗
      </a>

      {opened && (
        <p className="m-0 font-sans text-xs text-bo-muted-5">
          Opened in a new tab. This link is spent now — start another session if you need to get
          back in.
        </p>
      )}

      <div className="flex justify-end pt-1.5">
        <button type="button" onClick={onClose} className={cancelButtonClass}>
          Done
        </button>
      </div>
    </>
  );
}

function StartSupportSessionModal({
  open,
  onClose,
  shopId,
  shopName,
  staff,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  staff: ShopStaff[];
}) {
  const queryClient = useQueryClient();
  const [staffUserId, setStaffUserId] = useState("");
  const [reason, setReason] = useState("");
  const [started, setStarted] = useState<StartedSupportSession | null>(null);

  const start = useMutation({
    mutationFn: () =>
      supportSessionsApi.start(shopId, {
        staffUserId: staffUserId || undefined,
        reason: reason.trim() || undefined,
      }),
    onSuccess: (result) => {
      setStarted(result);
      queryClient.invalidateQueries({ queryKey: ["shops", "support-sessions", shopId] });
    },
  });

  function handleClose() {
    setStaffUserId("");
    setReason("");
    setStarted(null);
    start.reset();
    onClose();
  }

  const activeStaff = staff.filter((member) => member.isActive);

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">
          {started ? "Support session ready" : "Start a support session"}
        </h1>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>

      {started ? (
        <ReadyState started={started} onClose={handleClose} />
      ) : (
        <>
          <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
            Opens {shopName}'s own app in a new tab, signed in as one of their staff, so you can see
            exactly what they see. The session is read-only — every write is refused by the API, not
            just hidden in the UI — and it's recorded below.
          </p>

          <Field label="SIGN IN AS">
            <select
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              className={formInputClass}
            >
              <option value="">Owner (default)</option>
              {activeStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.roleName ? ` — ${member.roleName}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <p className="m-0 -mt-2 font-sans text-[11px] leading-relaxed text-bo-muted-5">
            Owner is right for most bug reports — it has every permission, so nothing fails for a
            reason unrelated to the bug. Pick a specific person when the report is permission-shaped
            ("my receptionist can't see the calendar").
          </p>

          <Field label="REASON (OPTIONAL)">
            <input
              type="text"
              placeholder="e.g. SUP-412 — owner reports double-booked 3pm slot"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={formInputClass}
            />
          </Field>

          {start.isError && (
            <p className="m-0 font-sans text-xs text-bo-danger">
              {errorMessage(start.error, "Couldn't start a support session.")}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-1.5">
            <button type="button" onClick={handleClose} className={cancelButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className={submitButtonClass}
            >
              {start.isPending ? "Starting…" : "Start session"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * The support-session block inside a shop's detail panel: the button that
 * starts one, and the audit trail of every one that has been started on
 * this shop.
 *
 * The log is shown to anyone with shops.view, not just to operators who
 * can start sessions — an audit trail only works as a deterrent if the
 * people who can't use the feature can still see who did.
 */
export function SupportSessionSection({
  shopId,
  shopName,
  staff,
}: {
  shopId: string;
  shopName: string;
  staff: ShopStaff[];
}) {
  const canImpersonate = useAuthStore((s) => s.hasPermission("shops.impersonate"));
  const queryClient = useQueryClient();
  const [startOpen, setStartOpen] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: ["shops", "support-sessions", shopId],
    queryFn: () => supportSessionsApi.list(shopId),
  });

  const endSession = useMutation({
    mutationFn: (sessionId: string) => supportSessionsApi.end(shopId, sessionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["shops", "support-sessions", shopId] }),
  });

  const sessions = sessionsQuery.data?.sessions ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          SUPPORT SESSIONS
        </span>
        {canImpersonate && (
          <button
            type="button"
            onClick={() => setStartOpen(true)}
            className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3 py-1.5 font-sans text-xs font-semibold text-bo-ink-soft"
          >
            Sign in as this shop
          </button>
        )}
      </div>

      {sessionsQuery.isLoading ? (
        <p className="m-0 font-sans text-xs text-bo-muted-5">Loading…</p>
      ) : sessionsQuery.isError ? (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(sessionsQuery.error, "Couldn't load the support-session log.")}
        </p>
      ) : sessions.length === 0 ? (
        <p className="m-0 font-sans text-xs text-bo-muted-5">
          Nobody from the back office has signed in to this shop.
        </p>
      ) : (
        <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-bo-page/40"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-sans text-xs font-semibold text-bo-ink-soft">
                  {session.boUserName}
                  <span className="ml-1.5 font-sans text-[10px] font-medium text-bo-muted-5">
                    as {session.staffUserName}
                    {session.staffRoleName ? ` · ${session.staffRoleName}` : ""}
                  </span>
                </span>
                <span className="truncate font-sans text-[11px] text-bo-muted-5">
                  {formatDateTime(session.startedAt)}
                  {session.reason ? ` · ${session.reason}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <StatusPill tone={SUPPORT_SESSION_STATE_TONE[session.state]}>
                  {SUPPORT_SESSION_STATE_LABEL[session.state]}
                </StatusPill>
                {canImpersonate && session.state === "active" && (
                  <button
                    type="button"
                    onClick={() => endSession.mutate(session.id)}
                    disabled={endSession.isPending}
                    className="font-sans text-xs font-semibold text-bo-danger disabled:opacity-50"
                  >
                    End
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {endSession.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(endSession.error, "Couldn't end that session.")}
        </p>
      )}

      <StartSupportSessionModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        shopId={shopId}
        shopName={shopName}
        staff={staff}
      />
    </div>
  );
}

export default SupportSessionSection;
