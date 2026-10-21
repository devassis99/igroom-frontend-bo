import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import {
  REP_STATUSES,
  STATUS_LABEL,
  followUpInDays,
  nextWeek,
  salesApi,
  type LeadDetail,
  type LeadStatus,
  type LogActivityInput,
  type RepStatus,
} from "@/lib/sales-api";
import { ErrorNote, inputClass, labelClass, primaryButtonClass, selectClass } from "./SalesUi";

type ActivityType = LogActivityInput["type"];

const TABS: Array<{ value: ActivityType; label: string }> = [
  { value: "visit", label: "Visit" },
  { value: "call", label: "Call" },
  { value: "note", label: "Note" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "demo", label: "Book demo" },
];

type FollowUp = "none" | "tomorrow" | "3days" | "week" | "date" | "keep";

const FOLLOW_UPS: Array<{ value: FollowUp; label: string }> = [
  { value: "keep", label: "Keep as is" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "3days", label: "In 3 days" },
  { value: "week", label: "Next week" },
  { value: "date", label: "Pick a date…" },
  { value: "none", label: "No follow-up" },
];

function followUpAt(choice: FollowUp, date: string): string | null | undefined {
  switch (choice) {
    case "keep":
      return undefined;
    case "none":
      return null;
    case "tomorrow":
      return followUpInDays(1);
    case "3days":
      return followUpInDays(3);
    case "week":
      return nextWeek();
    case "date":
      return date ? new Date(`${date}T10:00:00`).toISOString() : undefined;
  }
}

/**
 * The outcomes a rep picks on their phone after a visit or a call
 * ("How did the visit go?", B9l). Each one is a status move plus a
 * headline; "Not interested" hands over to Close lead, which asks why.
 */
const OUTCOMES: Array<{
  key: string;
  label: string;
  status?: RepStatus | "close" | "demo";
  hint: string;
  calls?: boolean;
}> = [
  { key: "talked", label: "Talked to the owner", status: "contacted", hint: "Contacted" },
  { key: "not_in", label: "Owner not in", hint: "Stays as is" },
  { key: "no_answer", label: "No answer", hint: "Stays as is", calls: true },
  { key: "demo", label: "Booked a demo", status: "demo", hint: "Demo booked" },
  { key: "no", label: "Not interested", status: "close", hint: "Close lead" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function localDateTimeValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * B9e's log box — what happened, the next follow-up, and optionally a
 * status move, in one save. Also the body of the Log sheet on Today and
 * on a phone, where it leads with the outcome picker instead.
 */
export function ActivityComposer({
  leadId,
  status,
  defaultType = "visit",
  withOutcomes = false,
  onSaved,
  onWantsClose,
}: {
  leadId: string;
  status: LeadStatus;
  defaultType?: ActivityType;
  /** Lead with "How did it go?" choices — the phone sheet and the Today "Log" button. */
  withOutcomes?: boolean;
  onSaved?: (detail: LeadDetail) => void;
  /** "Not interested" — open Close lead. */
  onWantsClose?: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ActivityType>(defaultType);
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp>(withOutcomes ? "3days" : "keep");
  const [date, setDate] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [moveTo, setMoveTo] = useState<RepStatus | "">("");
  const [demoAt, setDemoAt] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(15, 0, 0, 0);
    return localDateTimeValue(d);
  });

  const isRepStatus = (REP_STATUSES as readonly string[]).includes(status);
  const closed = status === "lost" || status === "not_now";

  const mutation = useMutation({
    mutationFn: (input: LogActivityInput) => salesApi.logActivity(leadId, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(["sales", "lead", leadId], detail);
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      setBody("");
      setNextStep("");
      setOutcome(null);
      setMoveTo("");
      setFollowUp(withOutcomes ? "3days" : "keep");
      onSaved?.(detail);
    },
  });

  const effectiveType: ActivityType = outcome === "demo" ? "demo" : type;

  function save() {
    const chosen = OUTCOMES.find((o) => o.key === outcome);
    if (chosen?.status === "close") {
      onWantsClose?.();
      return;
    }
    const input: LogActivityInput = {
      type: effectiveType,
      body: body.trim() || null,
    };
    if (effectiveType === "demo") {
      input.scheduledAt = new Date(demoAt).toISOString();
    } else {
      const at = followUpAt(followUp, date);
      if (at !== undefined) {
        input.nextFollowUpAt = at;
        input.nextFollowUpNote = nextStep.trim() || null;
      }
      if (chosen) input.outcome = chosen.label.toLowerCase();
      const target =
        chosen?.status && chosen.status !== "demo" ? chosen.status : moveTo || undefined;
      if (target && target !== status && isRepStatus) input.status = target as RepStatus;
    }
    mutation.mutate(input);
  }

  const outcomeChoices = OUTCOMES.filter((o) => (type === "call" ? o.key !== "not_in" : !o.calls));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="What kind of activity">
        {TABS.filter((t) => t.value !== "demo" || isRepStatus).map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={type === t.value}
            onClick={() => {
              setType(t.value);
              setOutcome(null);
            }}
            className={`rounded-lg px-3 py-1.5 font-sans text-xs ${
              type === t.value
                ? "bg-bo-dark-gradient font-semibold text-bo-on-dark"
                : "font-medium text-bo-muted-2 hover:bg-bo-well"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {withOutcomes && (type === "visit" || type === "call") && isRepStatus && (
        <div className="flex flex-col gap-2">
          {outcomeChoices.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOutcome(outcome === o.key ? null : o.key)}
              aria-pressed={outcome === o.key}
              className={`flex h-[52px] items-center justify-between rounded-[14px] px-4 text-left ${
                outcome === o.key ? "border-2 border-bo-dark" : "border border-bo-input-border"
              }`}
            >
              <span className="font-sans text-[16px] font-semibold text-bo-ink">{o.label}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-4">{o.hint}</span>
            </button>
          ))}
        </div>
      )}

      {effectiveType === "demo" ? (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Demo at</span>
          <input
            type="datetime-local"
            value={demoAt}
            onChange={(e) => setDemoAt(e.target.value)}
            className={inputClass}
          />
        </label>
      ) : null}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={withOutcomes ? 2 : 2}
        placeholder={
          effectiveType === "demo"
            ? "What do they want to see? (Bring the QR poster sample…)"
            : type === "note"
              ? "Anything the next person should know"
              : "What happened? Who did you talk to?"
        }
        className="w-full resize-none rounded-[10px] border border-bo-border bg-[oklch(98.5%_0.006_80)] px-3 py-2.5 font-sans text-[14px] text-bo-ink outline-none focus:border-bo-gold"
        aria-label="What happened"
      />

      {effectiveType !== "demo" && followUp !== "keep" && followUp !== "none" && (
        <input
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Next step — what Today should say (Send pricing and book a demo)"
          className="w-full rounded-[10px] border border-bo-border bg-bo-field px-3 py-2 font-sans text-xs text-bo-ink outline-none focus:border-bo-gold"
          aria-label="Next step"
          maxLength={200}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {effectiveType !== "demo" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs font-medium text-bo-muted-2">Next follow-up</span>
            <select
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value as FollowUp)}
              className={selectClass}
              aria-label="Next follow-up"
            >
              {FOLLOW_UPS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            {followUp === "date" && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={selectClass}
                aria-label="Follow-up date"
              />
            )}
            {!withOutcomes && isRepStatus && (
              <select
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value as RepStatus | "")}
                className={selectClass}
                aria-label="Status"
              >
                <option value="">Keep status</option>
                {REP_STATUSES.filter((s) => s !== status).map((s) => (
                  <option key={s} value={s}>
                    Move to {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <span className="font-sans text-xs text-bo-muted-4">
            Moves the lead to Demo booked and puts the demo on Today.
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={mutation.isPending || (closed && type === "demo")}
          className={
            withOutcomes
              ? `${primaryButtonClass} w-full sm:w-auto`
              : "rounded-lg bg-bo-dark-gradient px-3.5 py-2 font-sans text-xs font-semibold text-bo-on-dark disabled:opacity-50"
          }
        >
          {mutation.isPending
            ? "Saving…"
            : OUTCOMES.find((o) => o.key === outcome)?.status === "close"
              ? "Close lead…"
              : withOutcomes
                ? "Done"
                : "Save"}
        </button>
      </div>
      <ErrorNote error={mutation.error} fallback="Couldn't save that." />
    </div>
  );
}

/** The Log button's sheet — Today's rows, a freshly saved lead, and the phone's "How did the visit go?". */
export function LogActivityModal({
  lead,
  defaultType,
  onClose,
  onWantsClose,
  justSaved = false,
}: {
  lead: { id: string; shopName: string; status: LeadStatus } | null;
  defaultType?: ActivityType;
  onClose: () => void;
  onWantsClose?: () => void;
  /** Opened straight after "Save & log visit" — the heading confirms the save. */
  justSaved?: boolean;
}) {
  return (
    <Modal open={lead !== null} onClose={onClose} width={520} label="Log activity">
      {lead && (
        <>
          <div className="flex items-start justify-between">
            <div>
              {justSaved && (
                <p className="m-0 mb-1 font-sans text-xs font-semibold text-bo-success">
                  {lead.shopName} saved
                </p>
              )}
              <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">
                {justSaved ? "How did the visit go?" : "How did it go?"}
              </h2>
              {!justSaved && (
                <p className="m-0 font-sans text-xs text-bo-muted-4">{lead.shopName}</p>
              )}
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
          <ActivityComposer
            leadId={lead.id}
            status={lead.status}
            defaultType={defaultType}
            withOutcomes
            onSaved={onClose}
            onWantsClose={onWantsClose}
          />
        </>
      )}
    </Modal>
  );
}
