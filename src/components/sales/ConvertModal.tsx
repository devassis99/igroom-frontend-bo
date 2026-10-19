import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { BILLING_INTERVAL_LABEL } from "@/lib/shops-api";
import { formatMoney, salesApi, shortDate, type InviteResult, type Lead } from "@/lib/sales-api";
import {
  ErrorNote,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./SalesUi";

type OfferKey = "standard" | "trial30" | "trial30_20x3" | "trial30_50x3" | "custom";

const OFFERS: Array<{
  key: OfferKey;
  label: string;
  trialDays: number | null;
  pct: number;
  months: number;
}> = [
  { key: "standard", label: "Plan's standard trial", trialDays: null, pct: 0, months: 0 },
  { key: "trial30", label: "30-day trial", trialDays: 30, pct: 0, months: 0 },
  {
    key: "trial30_20x3",
    label: "30-day trial + 20% off 3 months",
    trialDays: 30,
    pct: 20,
    months: 3,
  },
  {
    key: "trial30_50x3",
    label: "30-day trial + 50% off 3 months",
    trialDays: 30,
    pct: 50,
    months: 3,
  },
  { key: "custom", label: "Custom…", trialDays: 30, pct: 0, months: 3 },
];

const STEPS = [
  { t: "Invite opened", d: "Logged on the timeline" },
  { t: "Account created", d: "Status moves to Onboarding" },
  { t: "Services, staff & hours set", d: "Rep gets a nudge if stuck" },
  { t: "First online booking", d: "Status moves to Live · commission earned" },
];

function Radio({
  checked,
  title,
  body,
  onClick,
}: {
  checked: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <label
      aria-label={title}
      className={`flex cursor-pointer gap-2.5 rounded-xl p-3.5 text-left ${checked ? "border-2 border-bo-dark" : "border border-bo-input-border p-[15px]"}`}
    >
      <input
        type="radio"
        name="convert-mode"
        checked={checked}
        onChange={onClick}
        className="sr-only"
      />
      <span
        className={`mt-px h-4 w-4 shrink-0 rounded-full ${checked ? "border-[5px] border-bo-dark" : "border-[1.5px] border-bo-faint"}`}
        aria-hidden
      />
      <span>
        <span className="mb-0.5 block font-sans text-[14px] font-semibold text-bo-ink">
          {title}
        </span>
        <span className="block font-sans text-xs text-bo-muted-2">{body}</span>
      </span>
    </label>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 font-sans text-[14px] font-medium text-bo-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[oklch(30%_0.02_50)]"
      />
      {children}
    </label>
  );
}

/**
 * B9f — Convert to shop. Sends the owner a signup link on a suggested
 * plan with an offer; nothing about the lead changes until the owner acts
 * on it. Both choices mint a signup link (so whatever they do next is
 * followed); "Payment link" is the one where you set the trial outright,
 * including none.
 */
export function ConvertModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const options = useQuery({
    queryKey: ["sales", "invite-options"],
    queryFn: salesApi.inviteOptions,
    enabled: lead !== null,
    staleTime: 5 * 60_000,
  });
  const [mode, setMode] = useState<"signup_invite" | "payment_link">("signup_invite");
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [priceId, setPriceId] = useState("");
  const [offer, setOffer] = useState<OfferKey>("trial30_20x3");
  const [custom, setCustom] = useState({ trialDays: 30, pct: 10, months: 3 });
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const prices = useMemo(
    () =>
      (options.data?.plans ?? []).flatMap((p) =>
        p.prices.map((price) => ({
          ...price,
          label: `${p.name} · ${BILLING_INTERVAL_LABEL[price.billingInterval] ?? price.billingInterval} · ${formatMoney(price.monthlyEquivalentCents, price.currency)}/mo`,
          productName: p.name,
        })),
      ),
    [options.data],
  );
  const selectedPrice = prices.find((p) => p.priceId === priceId) ?? prices[0];
  const chosen = OFFERS.find((o) => o.key === offer)!;
  const terms =
    offer === "custom"
      ? { trialDays: custom.trialDays, pct: custom.pct, months: custom.months }
      : chosen;
  const threshold = options.data?.approvalDiscountPct ?? 20;
  const needsApproval = terms.pct > threshold;

  const name = businessName ?? lead?.shopName ?? "";
  const email = ownerEmail ?? lead?.email ?? "";
  const phone = lead?.phone ?? null;

  function reset() {
    setMode("signup_invite");
    setBusinessName(null);
    setOwnerEmail(null);
    setPriceId("");
    setOffer("trial30_20x3");
    setSendEmail(true);
    setSendSms(true);
    setShowQr(false);
    setResult(null);
    setCopied(false);
  }

  const mutation = useMutation({
    mutationFn: () =>
      salesApi.createInvite(lead!.id, {
        mode,
        businessName: name.trim(),
        ownerEmail: email.trim() || null,
        ownerPhone: phone,
        priceId: selectedPrice!.priceId,
        trialDays: mode === "payment_link" ? (terms.trialDays ?? 0) : terms.trialDays,
        discountPct: terms.pct || null,
        discountMonths: terms.pct ? terms.months : null,
        seats: lead?.chairs && lead.chairs > 0 ? lead.chairs : null,
        sendEmail: sendEmail && !!email.trim(),
        sendSms: sendSms && !!phone,
      }),
    onSuccess: (r) => {
      setResult(r);
      if (r.lead) queryClient.setQueryData(["sales", "lead", lead!.id], r.lead);
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  function close() {
    reset();
    onClose();
  }

  const seatsNote = lead?.chairs ? ` · ${lead.chairs} seat${lead.chairs === 1 ? "" : "s"}` : "";

  return (
    <Modal open={lead !== null} onClose={close} width={640} label="Convert to shop">
      {lead && !result && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">
                Convert to shop
              </h2>
              <p className="m-0 font-sans text-xs text-bo-muted-4">
                {lead.shopName}
                {lead.ownerName ? ` · ${lead.ownerName}` : ""} · details copied from the lead
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="font-sans text-xl leading-none text-bo-muted-5"
            >
              ×
            </button>
          </div>

          <fieldset
            className="m-0 grid grid-cols-1 gap-2.5 border-0 p-0 sm:grid-cols-2"
            aria-label="How to send it"
          >
            <Radio
              checked={mode === "signup_invite"}
              onClick={() => setMode("signup_invite")}
              title="Signup invite"
              body="Owner signs up on the suggested plan and starts the free trial."
            />
            <Radio
              checked={mode === "payment_link"}
              onClick={() => setMode("payment_link")}
              title="Payment link"
              body="You set plan, price and terms — no trial unless you add one. Same as Create Payment Link."
            />
          </fieldset>

          <div className="grid grid-cols-1 gap-x-3.5 gap-y-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Business name</span>
              <input
                value={name}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Owner email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@shop.com"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Suggested plan</span>
              <select
                value={selectedPrice?.priceId ?? ""}
                onChange={(e) => setPriceId(e.target.value)}
                className={inputClass}
                disabled={!prices.length}
              >
                {prices.map((p) => (
                  <option key={p.priceId} value={p.priceId}>
                    {p.label}
                    {seatsNote}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Offer</span>
              <select
                value={offer}
                onChange={(e) => setOffer(e.target.value as OfferKey)}
                className={inputClass}
              >
                {OFFERS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.key === "standard" && selectedPrice
                      ? `${o.label} (${selectedPrice.trialDays} days)`
                      : o.label}
                    {o.pct > threshold ? " · needs approval" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {offer === "custom" && (
            <div className="-mt-1 grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Trial days</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={custom.trialDays}
                  onChange={(e) => setCustom({ ...custom, trialDays: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>% off</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={custom.pct}
                  onChange={(e) => setCustom({ ...custom, pct: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>For months</span>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={custom.months}
                  onChange={(e) => setCustom({ ...custom, months: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
            </div>
          )}
          <p
            className={`-mt-2 m-0 font-sans text-[12px] ${needsApproval ? "font-semibold text-bo-gold" : "text-bo-muted-4"}`}
          >
            {needsApproval
              ? `This offer is above ${threshold}% off — it waits for a manager's approval before the invite sends.`
              : `Offers above ${threshold}% off need manager approval before the invite sends.`}
          </p>

          <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2">
            <span className={labelClass}>Send by</span>
            <Check checked={sendEmail && !!email.trim()} onChange={setSendEmail}>
              Email
            </Check>
            {phone ? (
              <Check checked={sendSms} onChange={setSendSms}>
                SMS to {phone}
              </Check>
            ) : (
              <span className="font-sans text-xs text-bo-muted-5">
                No phone on the lead for SMS
              </span>
            )}
            <Check checked={showQr} onChange={setShowQr}>
              Show QR to scan now
            </Check>
          </div>

          <div className="rounded-xl bg-bo-well px-4 py-3.5">
            <p className="m-0 mb-3 font-sans text-xs font-semibold text-bo-ink-soft">
              The lead updates itself after you send
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.t} className="flex flex-col gap-1.5">
                  <span className="h-1 rounded-sm bg-bo-input-border" />
                  <span className="font-sans text-xs font-semibold text-bo-ink-soft">{s.t}</span>
                  <span className="font-sans text-[12px] text-bo-muted-3">{s.d}</span>
                </div>
              ))}
            </div>
          </div>

          <ErrorNote error={mutation.error ?? options.error} fallback="Couldn't send the invite." />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !selectedPrice || !name.trim()}
              className={primaryButtonClass}
            >
              {mutation.isPending ? "Sending…" : needsApproval ? "Ask for approval" : "Send invite"}
            </button>
          </div>
        </>
      )}

      {lead && result && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">
                {result.invite.status === "pending_approval"
                  ? "Waiting for approval"
                  : "Invite sent"}
              </h2>
              <p className="m-0 font-sans text-xs text-bo-muted-4">{lead.shopName}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="font-sans text-xl leading-none text-bo-muted-5"
            >
              ×
            </button>
          </div>
          {result.invite.status === "pending_approval" ? (
            <p className="m-0 font-sans text-sm text-bo-muted-2">
              Offers above {threshold}% off need a manager. It's on their Today list now, and the
              invite goes out the moment they approve it — you'll see it on the timeline.
            </p>
          ) : (
            <>
              <p className="m-0 font-sans text-sm text-bo-muted-2">
                {[
                  result.invite.delivery?.email
                    ? `Email: ${deliveryWord(result.invite.delivery.email)}`
                    : null,
                  result.invite.delivery?.sms
                    ? `SMS: ${deliveryWord(result.invite.delivery.sms)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Not sent by email or SMS — share the link or the QR code."}
              </p>
              {result.url && (
                <div className="flex items-center gap-2 rounded-[10px] border border-bo-input-border bg-bo-well px-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-bo-muted-1">
                    {result.url}
                  </code>
                  <button
                    type="button"
                    className="font-sans text-xs font-semibold text-bo-gold"
                    onClick={() => {
                      void navigator.clipboard.writeText(result.url!).then(() => setCopied(true));
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              {result.url && result.invite.linkExpiresAt && (
                <p className="-mt-1 m-0 font-sans text-xs text-bo-muted-4">
                  Works for this shop until {shortDate(result.invite.linkExpiresAt)}, and stops once
                  they've signed up.
                </p>
              )}
              {(showQr ||
                !result.invite.delivery ||
                Object.keys(result.invite.delivery).length === 0) &&
                result.qrDataUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={result.qrDataUrl}
                      alt="QR code for the signup link"
                      className="h-56 w-56 rounded-xl border border-bo-border"
                    />
                    <span className="font-sans text-xs text-bo-muted-4">
                      Owner scans this with their phone camera
                    </span>
                  </div>
                )}
            </>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={close} className={primaryButtonClass}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function deliveryWord(outcome: string): string {
  if (outcome === "sent") return "sent";
  if (outcome === "logged") return "not configured on this server (logged)";
  return "failed — copy the link instead";
}
