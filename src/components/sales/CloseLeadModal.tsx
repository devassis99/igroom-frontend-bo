import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { salesApi, shortDate, type Lead, type LeadDetail } from "@/lib/sales-api";
import {
  Chip,
  ErrorNote,
  Segmented,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  useSalesMe,
} from "./SalesUi";

function at10(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0);
}

function inMonths(n: number): Date {
  const now = new Date();
  return at10(new Date(now.getFullYear(), now.getMonth() + n, now.getDate()));
}

/** The first working day after New Year — "after the holidays". */
function afterTheHolidays(): Date {
  const now = new Date();
  return at10(
    new Date(
      now.getMonth() === 0 && now.getDate() < 6 ? now.getFullYear() : now.getFullYear() + 1,
      0,
      6,
    ),
  );
}

/**
 * B9g — Close lead. Lost asks why and what they're staying with (that's
 * what Rep Stats' "Why leads are lost" is built from), and can send the
 * lead back to the pool after a cooling-off period. Not now keeps it with
 * the same rep and brings it back on a date.
 */
export function CloseLeadModal({
  lead,
  onClose,
  onDone,
}: {
  lead: Pick<Lead, "id" | "shopName" | "ownerName" | "rep" | "currentTool"> | null;
  onClose: () => void;
  onDone?: (detail: LeadDetail) => void;
}) {
  const me = useSalesMe();
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<"lost" | "not_now">("lost");
  const [reason, setReason] = useState("");
  const [tool, setTool] = useState("");
  const [note, setNote] = useState("");
  const [returnToPool, setReturnToPool] = useState(true);
  const [when, setWhen] = useState<"1m" | "3m" | "holidays" | "date">("3m");
  const [date, setDate] = useState("");

  const lostReasons = me.data?.vocab.lostReasons ?? [];
  const notNowReasons = me.data?.vocab.notNowReasons ?? [];
  const returnMonths = me.data?.settings.lostReturnMonths ?? 6;
  const holidays = useMemo(afterTheHolidays, []);

  const until = (() => {
    if (when === "1m") return inMonths(1);
    if (when === "3m") return inMonths(3);
    if (when === "holidays") return holidays;
    return date ? new Date(`${date}T10:00:00`) : null;
  })();

  function reset() {
    setOutcome("lost");
    setReason("");
    setTool("");
    setNote("");
    setReturnToPool(true);
    setWhen("3m");
    setDate("");
  }

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.closeLead(
        lead!.id,
        outcome === "lost"
          ? {
              outcome,
              reason,
              tool: tool || lead!.currentTool || null,
              note: note.trim() || null,
              returnToPool,
            }
          : { outcome, reason, note: note.trim() || null, until: until!.toISOString() },
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(["sales", "lead", detail.lead.id], detail);
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      reset();
      onDone?.(detail);
      onClose();
    },
  });

  const canSubmit =
    !!reason && (outcome === "lost" || (until !== null && until.getTime() > Date.now()));
  const owner = lead?.rep?.shortName ?? "you";

  return (
    <Modal
      open={lead !== null}
      onClose={() => {
        reset();
        onClose();
      }}
      label="Close lead"
    >
      {lead && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">Close lead</h2>
              <p className="m-0 font-sans text-xs text-bo-muted-4">
                {lead.shopName}
                {lead.ownerName ? ` · ${lead.ownerName}` : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="font-sans text-xl leading-none text-bo-muted-5"
            >
              ×
            </button>
          </div>

          <Segmented
            full
            value={outcome}
            onChange={(v) => {
              setOutcome(v);
              setReason("");
            }}
            options={[
              { value: "lost", label: "Lost" },
              { value: "not_now", label: "Not now" },
            ]}
          />

          {outcome === "lost" ? (
            <>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Main reason</span>
                <div className="flex flex-wrap gap-1.5">
                  {lostReasons.map((r) => (
                    <Chip key={r} active={reason === r} onClick={() => setReason(r)}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Which tool are they staying with</span>
                <select
                  value={tool}
                  onChange={(e) => setTool(e.target.value)}
                  className={inputClass}
                >
                  <option value="">
                    {lead.currentTool ? `${lead.currentTool} (what they use now)` : "Not sure"}
                  </option>
                  {(me.data?.vocab.bookingTools ?? [])
                    .filter((t) => t !== lead.currentTool)
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Bring it back</span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={when === "1m"} onClick={() => setWhen("1m")}>
                    In 1 month
                  </Chip>
                  <Chip active={when === "3m"} onClick={() => setWhen("3m")}>
                    In 3 months
                  </Chip>
                  <Chip active={when === "holidays"} onClick={() => setWhen("holidays")}>
                    After the holidays · {shortDate(holidays)}
                  </Chip>
                  <Chip active={when === "date"} onClick={() => setWhen("date")}>
                    Pick a date
                  </Chip>
                </div>
                {when === "date" && (
                  <input
                    type="date"
                    value={date}
                    min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                    aria-label="Bring it back on"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Why not now</span>
                <div className="flex flex-wrap gap-1.5">
                  {notNowReasons.map((r) => (
                    <Chip key={r} active={reason === r} onClick={() => setReason(r)}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none text-[13px]`}
            />
          </label>

          {outcome === "lost" ? (
            <label className="flex items-center gap-2 font-sans text-[13px] font-medium text-bo-ink-soft">
              <input
                type="checkbox"
                checked={returnToPool}
                onChange={(e) => setReturnToPool(e.target.checked)}
                className="h-4 w-4 accent-[oklch(30%_0.02_50)]"
              />
              Return to pool in {returnMonths} months for another try
            </label>
          ) : (
            until && (
              <p className="m-0 rounded-[10px] bg-bo-well px-3 py-2.5 font-sans text-xs text-bo-muted-2">
                Stays with {owner} and shows up in {owner === "you" ? "your" : "their"} Today list
                on {shortDate(until)}. Ownership lock pauses until then.
              </p>
            )
          )}

          <ErrorNote error={mutation.error} fallback="Couldn't close this lead." />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={primaryButtonClass}
            >
              {mutation.isPending
                ? "Saving…"
                : outcome === "lost"
                  ? "Mark as lost"
                  : until
                    ? `Snooze to ${shortDate(until)}`
                    : "Snooze"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
