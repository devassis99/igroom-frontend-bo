import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { ActivityComposer } from "@/components/sales/ActivityComposer";
import { AddressField, type AddressValue } from "@/components/sales/AddressField";
import { CloseLeadModal } from "@/components/sales/CloseLeadModal";
import { ConvertModal } from "@/components/sales/ConvertModal";
import {
  Card,
  ErrorNote,
  Loading,
  RepAvatar,
  StatusBadge,
  Stepper,
  inputClass,
  labelClass,
  linkButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  useSalesMe,
} from "@/components/sales/SalesUi";
import {
  PIPELINE_STATUSES,
  REP_STATUSES,
  STATUS_LABEL,
  dayAndTime,
  sinceLabel,
  salesApi,
  shortDate,
  telHref,
  type InviteSummary,
  type Lead,
  type LeadDetail,
  type LeadStatus,
  type TimelineEntry,
} from "@/lib/sales-api";
import { ApiError } from "@/lib/http";

const DOT: Record<string, string> = {
  demo: "bg-[oklch(65%_0.11_85)]",
  visit: "bg-bo-dark",
  call: "bg-bo-dark",
  note: "bg-bo-dark",
  email: "bg-bo-dark",
  sms: "bg-bo-dark",
  went_live: "bg-bo-success",
  account_created: "bg-bo-teal",
  invite_sent: "bg-bo-gold",
  invite_opened: "bg-bo-gold",
  closed: "bg-bo-red",
  returned_to_pool: "bg-bo-red",
};

function Steps({ status }: { status: LeadStatus }) {
  const index = PIPELINE_STATUSES.indexOf(status);
  return (
    <div className="grid grid-cols-6 gap-1.5" aria-label={`Stage: ${STATUS_LABEL[status]}`}>
      {PIPELINE_STATUSES.map((s, i) => (
        <div key={s} className="flex flex-col gap-1.5">
          <span
            className={`h-1.5 rounded-[3px] ${
              index < 0
                ? "bg-bo-border-soft"
                : i < index
                  ? "bg-bo-dark"
                  : i === index
                    ? "bg-[oklch(65%_0.11_85)]"
                    : "bg-bo-border-soft"
            }`}
          />
          <span
            className={`font-sans text-[11px] whitespace-nowrap sm:truncate ${i === index ? "" : "hidden sm:block"} ${i === index ? "font-semibold text-bo-ink-soft" : i < index ? "font-medium text-bo-ink-soft" : "font-medium text-bo-muted-6"}`}
          >
            {STATUS_LABEL[s]}
          </span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Card className="px-5 py-4.5">
      <p className="m-0 mb-3.5 font-sans text-[15px] font-semibold text-bo-ink">Timeline</p>
      {entries.map((t, i) => (
        <div key={t.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`mt-[3px] h-3 w-3 shrink-0 rounded-full ${DOT[t.type] ?? "bg-[oklch(75%_0.02_60)]"}`}
            />
            {i < entries.length - 1 && <span className="my-1 w-0.5 flex-1 bg-bo-border-soft" />}
          </div>
          <div className="pb-3.5">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <span className="font-sans text-[13px] font-semibold text-bo-ink">
                {t.summary ?? t.type}
              </span>
              {t.upcoming && (
                <span className="rounded-md bg-bo-gold-tint px-[7px] py-[2px] font-sans text-[10px] font-semibold text-bo-gold">
                  Upcoming
                </span>
              )}
            </div>
            <p className="m-0 mb-1 font-sans text-[11px] text-bo-muted-4">
              {dayAndTime(t.scheduledAt ?? t.occurredAt)}
              {t.by ? ` · ${t.by.shortName}` : " · iGroom"}
            </p>
            {t.body && (
              <p className="m-0 font-sans text-[13px] leading-[1.45] whitespace-pre-line text-bo-muted-1">
                {t.body}
              </p>
            )}
          </div>
        </div>
      ))}
    </Card>
  );
}

function EditDetailsModal({
  lead,
  open,
  onClose,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const me = useSalesMe();
  const [form, setForm] = useState(() => ({
    shopName: lead.shopName,
    ownerName: lead.ownerName ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    chairs: lead.chairs ?? 0,
    rentedChairs: lead.rentedChairs ?? 0,
    currentTool: lead.currentTool ?? "",
    notes: lead.notes ?? "",
  }));
  const [address, setAddress] = useState<AddressValue>({
    address: lead.address ?? "",
    latitude: lead.latitude,
    longitude: lead.longitude,
  });
  const mutation = useMutation({
    mutationFn: () =>
      salesApi.updateLead(lead.id, {
        shopName: form.shopName,
        ownerName: form.ownerName || null,
        phone: form.phone || null,
        email: form.email || null,
        chairs: form.chairs,
        rentedChairs: form.rentedChairs,
        currentTool: form.currentTool || null,
        notes: form.notes || null,
        address: address.address || null,
        latitude: address.latitude,
        longitude: address.longitude,
      }),
    onSuccess: (detail) => {
      queryClient.setQueryData(["sales", "lead", lead.id], detail);
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      onClose();
    },
  });
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={String(form[key])}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputClass}
      />
    </label>
  );
  return (
    <Modal open={open} onClose={onClose} width={580} label="Edit shop details">
      <h2 className="m-0 font-sans text-xl font-semibold text-bo-ink">Shop details</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("shopName", "Shop name")}
        {field("ownerName", "Owner")}
        {field("phone", "Phone", "tel")}
        {field("email", "Email", "email")}
        <div className="sm:col-span-2">
          <AddressField value={address} onChange={setAddress} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Chairs</span>
          <Stepper
            value={form.chairs}
            onChange={(n) => setForm({ ...form, chairs: n })}
            label="chairs"
            max={60}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Of which rented</span>
          <Stepper
            value={form.rentedChairs}
            onChange={(n) => setForm({ ...form, rentedChairs: n })}
            label="rented chairs"
            max={form.chairs}
          />
        </div>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Books clients with</span>
          <select
            value={form.currentTool}
            onChange={(e) => setForm({ ...form, currentTool: e.target.value })}
            className={inputClass}
          >
            <option value="">Not sure</option>
            {(me.data?.vocab.bookingTools ?? []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            {form.currentTool &&
              !(me.data?.vocab.bookingTools ?? []).includes(form.currentTool) && (
                <option value={form.currentTool}>{form.currentTool}</option>
              )}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </label>
      </div>
      <ErrorNote error={mutation.error} fallback="Couldn't save the details." />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.shopName.trim()}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function ReassignModal({
  detail,
  open,
  onClose,
}: {
  detail: LeadDetail;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const me = useSalesMe();
  const [reason, setReason] = useState("");
  const [toRepId, setToRepId] = useState("");
  const isManager = me.data?.me.canManage ?? false;
  const mutation = useMutation({
    mutationFn: () =>
      isManager
        ? salesApi
            .assignLeads([detail.lead.id], toRepId === "pool" ? null : toRepId)
            .then(() => salesApi.getLead(detail.lead.id))
        : salesApi.requestReassignment(detail.lead.id, {
            toRepId: toRepId || null,
            reason: reason || null,
          }),
    onSuccess: (d) => {
      queryClient.setQueryData(["sales", "lead", detail.lead.id], d);
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} label={isManager ? "Assign lead" : "Request reassignment"}>
      <h2 className="m-0 font-sans text-xl font-semibold text-bo-ink">
        {isManager ? "Assign lead" : "Request reassignment"}
      </h2>
      <p className="m-0 font-sans text-[13px] text-bo-muted-2">
        {isManager
          ? "Moves the lead and restarts its ownership lock. The new owner sees it under New for you."
          : "A manager approves moves between reps. Commission follows whoever converts the shop."}
      </p>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{isManager ? "Give it to" : "Who should own it"}</span>
        <select value={toRepId} onChange={(e) => setToRepId(e.target.value)} className={inputClass}>
          <option value="">{isManager ? "Pick a rep…" : "Me"}</option>
          {(me.data?.reps ?? [])
            .filter(
              (r) => r.id !== detail.lead.rep?.repId && (isManager || r.id !== me.data?.me.rep?.id),
            )
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          {isManager && <option value="pool">Unassigned pool</option>}
        </select>
      </label>
      {!isManager && (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Why</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="I know the owner — we spoke at the barber expo."
            className={`${inputClass} resize-none`}
          />
        </label>
      )}
      <ErrorNote error={mutation.error} fallback="Couldn't do that." />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (isManager && !toRepId)}
          className={primaryButtonClass}
        >
          {isManager ? "Assign" : "Send request"}
        </button>
      </div>
    </Modal>
  );
}

function InviteRow({ invite }: { invite: InviteSummary }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const label: Record<InviteSummary["status"], string> = {
    pending_approval: "Waiting for approval",
    sent: "Sent",
    opened: "Opened",
    account_created: "Signed up",
    rejected: "Declined by a manager",
    cancelled: "Cancelled",
  };
  const terms = [
    invite.trialDays ? `${invite.trialDays}-day trial` : null,
    invite.discountPct
      ? `${invite.discountPct}% off${invite.discountMonths ? ` × ${invite.discountMonths} mo` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" + ");
  return (
    <div className="flex flex-col gap-1.5 border-b border-bo-border-soft px-4.5 py-2.5 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-xs font-semibold text-bo-ink-soft">
          {invite.mode === "payment_link" ? "Payment link" : "Signup invite"}
          {terms ? ` · ${terms}` : ""}
        </span>
        <span className="font-sans text-[11px] font-semibold text-bo-muted-3">
          {label[invite.status]}
        </span>
      </div>
      <span className="font-sans text-[11px] text-bo-muted-4">
        {invite.sentAt
          ? `Sent ${shortDate(invite.sentAt)}`
          : `Created ${shortDate(invite.createdAt)}`}
        {invite.openedAt ? ` · opened ${shortDate(invite.openedAt)}` : ""}
        {invite.ownerEmail ? ` · ${invite.ownerEmail}` : ""}
      </span>
      {invite.url && invite.status !== "account_created" && (
        <div className="flex gap-3">
          <button
            type="button"
            className={linkButtonClass}
            onClick={() =>
              void navigator.clipboard.writeText(invite.url!).then(() => setCopied(true))
            }
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            className={linkButtonClass}
            onClick={() =>
              qr ? setQr(null) : void salesApi.inviteLink(invite.id).then((r) => setQr(r.qrDataUrl))
            }
          >
            {qr ? "Hide QR" : "Show QR"}
          </button>
        </div>
      )}
      {qr && (
        <img
          src={qr}
          alt="QR code for the signup link"
          className="h-44 w-44 self-center rounded-lg border border-bo-border"
        />
      )}
    </div>
  );
}

/**
 * B9e — one lead: where it is, everything that has happened to it, and
 * who owns it until when. The log box at the top is the page's main job;
 * the shop's details and ownership sit to the side.
 */
export function SalesLeadPage() {
  const { leadId = "" } = useParams();
  const me = useSalesMe();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["sales", "lead", leadId],
    queryFn: () => salesApi.getLead(leadId),
  });
  const [closing, setClosing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const onDetail = (d: LeadDetail) => {
    queryClient.setQueryData(["sales", "lead", leadId], d);
    void queryClient.invalidateQueries({ queryKey: ["sales"] });
  };
  const changeStatus = useMutation({
    mutationFn: (s: LeadStatus) => salesApi.changeStatus(leadId, s),
    onSuccess: onDetail,
  });
  const claim = useMutation({ mutationFn: () => salesApi.claimLead(leadId), onSuccess: onDetail });
  const reopen = useMutation({
    mutationFn: () => salesApi.reopenLead(leadId),
    onSuccess: onDetail,
  });

  if (query.isLoading) return <Loading />;
  if (query.error) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Card className="flex flex-col items-start gap-2 p-8">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">
          {notFound ? "Lead not found" : "Couldn't load this lead"}
        </h1>
        <p className="m-0 font-sans text-sm text-bo-muted-4">
          {notFound
            ? "It may belong to another rep, or have been removed."
            : (query.error as Error).message}
        </p>
        <Link to="/sales/pipeline" className={linkButtonClass}>
          Back to the pipeline
        </Link>
      </Card>
    );
  }
  const detail = query.data!;
  const { lead, permissions } = detail;
  const isManager = me.data?.me.canManage ?? false;
  const closed = lead.status === "lost" || lead.status === "not_now";
  const isRepStatus = (REP_STATUSES as readonly string[]).includes(lead.status);

  const details: Array<[string, React.ReactNode]> = [
    ["Owner", lead.ownerName ?? "—"],
    [
      "Phone",
      lead.phone ? (
        <a key="phone" href={telHref(lead.phone)} className="hover:underline">
          {lead.phone}
        </a>
      ) : (
        <span key="phone" className="text-bo-red">
          Missing
        </span>
      ),
    ],
    ["Email", lead.email ?? "—"],
    ["Address", lead.address ?? "—"],
    [
      "Chairs",
      lead.chairs === null
        ? "—"
        : `${lead.chairs}${lead.rentedChairs ? ` (${lead.rentedChairs} rented)` : ""}`,
    ],
    ["Books clients with", lead.currentTool ?? "—"],
    ["Source", `${lead.sourceLabel}${lead.isAuto ? " · auto" : ""}`],
  ];
  if (lead.sourceDetail) details.push(["", lead.sourceDetail]);

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 mb-1.5 font-sans text-xs font-medium text-bo-muted-4">
            <Link to="/sales/pipeline" className="text-bo-gold hover:underline">
              {isManager ? "Pipeline" : "My Leads"}
            </Link>{" "}
            / {lead.shopName}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">{lead.shopName}</h1>
            <StatusBadge status={lead.status} label={lead.statusLabel} />
            {lead.needsPhone && (
              <span className="rounded-full bg-bo-danger-bg px-2 py-0.5 font-sans text-[11px] font-semibold text-bo-red">
                No phone
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {permissions.canClaim && (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={claim.isPending}
              onClick={() => claim.mutate()}
            >
              Claim lead
            </button>
          )}
          {permissions.canReopen && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={reopen.isPending}
              onClick={() => reopen.mutate()}
            >
              Reopen
            </button>
          )}
          {permissions.canClose && (
            <button type="button" className={secondaryButtonClass} onClick={() => setClosing(true)}>
              Close lead
            </button>
          )}
          {permissions.canWork && isRepStatus && (
            <select
              value=""
              onChange={(e) => e.target.value && changeStatus.mutate(e.target.value as LeadStatus)}
              className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3 py-2 font-sans text-[13px] font-medium text-bo-ink-soft"
              aria-label="Change status"
              disabled={changeStatus.isPending}
            >
              <option value="">Change status</option>
              {REP_STATUSES.filter((s) => s !== lead.status).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
          {permissions.canConvert && (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => setConverting(true)}
            >
              Convert to shop
            </button>
          )}
        </div>
      </div>
      <ErrorNote
        error={changeStatus.error ?? claim.error ?? reopen.error}
        fallback="That didn't work."
      />

      <Steps status={lead.status} />

      {closed && (
        <div className="rounded-xl border border-bo-border bg-bo-well px-4 py-3 font-sans text-[13px] text-bo-ink-soft">
          {lead.status === "lost" ? (
            <>
              <b className="font-semibold">Lost · {lead.closedReason}</b>
              {lead.closedTool ? ` — staying with ${lead.closedTool}` : ""}.
              {lead.closedNote ? ` ${lead.closedNote}` : ""}
              {lead.returnToPoolAt ? ` Back to the pool on ${shortDate(lead.returnToPoolAt)}.` : ""}
            </>
          ) : (
            <>
              <b className="font-semibold">Not now · {lead.closedReason}</b>. Back on{" "}
              {lead.snoozedUntil ? shortDate(lead.snoozedUntil) : "—"}
              {lead.rep ? ` with ${lead.rep.shortName}` : ""}.
              {lead.closedNote ? ` ${lead.closedNote}` : ""}
            </>
          )}
        </div>
      )}
      {detail.pendingReassignment && (
        <div className="rounded-xl border border-[oklch(72%_0.09_85/0.6)] bg-bo-gold-bg px-4 py-3 font-sans text-[13px] text-bo-ink-soft">
          Reassignment to {detail.pendingReassignment.toRepName ?? "another rep"} is waiting for a
          manager
          {detail.pendingReassignment.reason ? ` — “${detail.pendingReassignment.reason}”` : ""}.
        </div>
      )}
      {lead.territoryClaimUntil && new Date(lead.territoryClaimUntil) > new Date() && (
        <div className="rounded-xl border border-bo-border bg-bo-well px-4 py-3 font-sans text-[13px] text-bo-ink-soft">
          Added in {lead.territory?.name ?? "another rep's territory"}. Its owner can claim it until{" "}
          {dayAndTime(lead.territoryClaimUntil)}.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          {permissions.canWork && (
            <Card className="px-4 py-3.5">
              <ActivityComposer
                leadId={lead.id}
                status={lead.status}
                onWantsClose={() => setClosing(true)}
              />
            </Card>
          )}
          {!permissions.canWork && !permissions.canClaim && (
            <p className="m-0 font-sans text-xs text-bo-muted-4">
              {lead.rep
                ? `${lead.rep.name} owns this lead — you can read it, not work it.`
                : "In the unassigned pool."}
            </p>
          )}
          <Timeline entries={detail.timeline} />
        </div>

        <div className="flex flex-col gap-3.5">
          {detail.setup && lead.status === "onboarding" && (
            <Card className="flex flex-col gap-2.5 px-4.5 py-4">
              <div className="flex items-center justify-between">
                <p className="m-0 font-sans text-sm font-semibold text-bo-ink">Setting up</p>
                <Link to={`/shops/${detail.setup.accountId}`} className={linkButtonClass}>
                  Open shop
                </Link>
              </div>
              {detail.setup.checklist.map((c) => (
                <div key={c.step} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4.5 w-4.5 items-center justify-center rounded-full font-sans text-[10px] font-bold ${
                      c.done
                        ? "bg-bo-success text-bo-on-dark"
                        : c.current
                          ? "border-2 border-bo-teal"
                          : "border border-bo-input-border"
                    }`}
                  >
                    {c.done ? "✓" : ""}
                  </span>
                  <span
                    className={`font-sans text-[13px] capitalize ${c.current ? "font-semibold text-bo-ink" : "text-bo-muted-2"}`}
                  >
                    {c.label}
                  </span>
                  {c.current && lead.setupStepSince && (
                    <span className="ml-auto font-sans text-[11px] text-bo-muted-4">
                      {sinceLabel(lead.setupStepSince)}
                    </span>
                  )}
                </div>
              ))}
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-bo-border-soft px-4.5 py-3.5">
              <p className="m-0 font-sans text-sm font-semibold text-bo-ink">Shop details</p>
              {permissions.canWork && (
                <button type="button" className={linkButtonClass} onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
            </div>
            {details.map(([k, v], i) => (
              <div
                key={`${k}-${i}`}
                className="flex justify-between gap-3 border-b border-[oklch(95%_0.006_65)] px-4.5 py-[9px] last:border-b-0"
              >
                <span className="shrink-0 font-sans text-xs text-bo-muted-4">{k}</span>
                <span className="text-right font-sans text-xs font-medium break-words text-bo-ink-soft">
                  {v}
                </span>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-2.5 px-4.5 py-4">
            <p className="m-0 font-sans text-sm font-semibold text-bo-ink">Ownership</p>
            <div className="flex items-center gap-2.5">
              <RepAvatar rep={lead.rep} size={30} />
              <div>
                <p className="m-0 font-sans text-[13px] font-semibold text-bo-ink">
                  {lead.rep?.name ?? "Unassigned pool"}
                </p>
                <p className="m-0 font-sans text-[11px] text-bo-muted-4">
                  {lead.rep
                    ? lead.rep.type === "agent"
                      ? "Commission agent"
                      : "Employee"
                    : "Any rep can claim it"}
                  {lead.territory
                    ? ` · ${lead.territory.name}`
                    : lead.cityName
                      ? ` · ${lead.cityName}`
                      : ""}
                </p>
              </div>
            </div>
            {lead.lockUntil && lead.rep && (
              <p className="m-0 font-sans text-xs text-bo-muted-2">
                Locked to {lead.rep.name.split(" ")[0]} until {shortDate(lead.lockUntil)}. Returns
                to the pool after {detail.settings.lockDays} days with no activity.
              </p>
            )}
            {lead.status === "not_now" && (
              <p className="m-0 font-sans text-xs text-bo-muted-2">
                The ownership lock is paused while it's snoozed.
              </p>
            )}
            {(permissions.canAssign || permissions.canRequestReassignment) && (
              <button
                type="button"
                className={`${linkButtonClass} self-start`}
                onClick={() => setReassigning(true)}
              >
                {permissions.canAssign ? "Assign to someone else" : "Request reassignment"}
              </button>
            )}
          </Card>

          {detail.invites.length > 0 && (
            <Card className="overflow-hidden">
              <p className="m-0 border-b border-bo-border-soft px-4.5 py-3.5 font-sans text-sm font-semibold text-bo-ink">
                Invites
              </p>
              {detail.invites.map((i) => (
                <InviteRow key={i.id} invite={i} />
              ))}
            </Card>
          )}
        </div>
      </div>

      <CloseLeadModal lead={closing ? lead : null} onClose={() => setClosing(false)} />
      <ConvertModal lead={converting ? lead : null} onClose={() => setConverting(false)} />
      {editing && <EditDetailsModal lead={lead} open={editing} onClose={() => setEditing(false)} />}
      {reassigning && (
        <ReassignModal detail={detail} open={reassigning} onClose={() => setReassigning(false)} />
      )}
    </div>
  );
}

export default SalesLeadPage;
