import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Select, type SelectOption } from "@/components/ui/Select";
import {
  duplicatesFrom,
  salesApi,
  type DuplicateMatch,
  type LeadDetail,
  type LeadSource,
} from "@/lib/sales-api";
import { AddressField, postalCodeOf, type AddressValue } from "./AddressField";
import {
  Chip,
  ErrorNote,
  Stepper,
  inputClass,
  labelClass,
  linkButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  useSalesMe,
} from "./SalesUi";

const EMPTY_ADDRESS: AddressValue = { address: "", latitude: null, longitude: null };

function describeMatch(m: DuplicateMatch): string {
  const why = [
    m.samePhone ? "Same phone" : null,
    m.sameAddress ? "same address" : null,
    m.distanceM !== null && !m.sameAddress ? `${m.distanceM} m away` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const whose =
    m.kind === "shop"
      ? "Already on iGroom"
      : m.ownerName
        ? `Owned by ${m.ownerName}`
        : "In the unassigned pool";
  return `${why.charAt(0).toUpperCase()}${why.slice(1)}. ${whose} · ${m.statusLabel}`;
}

/**
 * B9d — New lead. Only shop name and phone are required; everything else
 * can wait. While the rep types, the phone and the pin are checked
 * against every lead and every shop on the platform, so "somebody's
 * already working this one" shows up before they save, not after.
 */
export function NewLeadModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (detail: LeadDetail, logVisit: boolean) => void;
}) {
  const me = useSalesMe();
  const queryClient = useQueryClient();
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [chairs, setChairs] = useState(1);
  const [tool, setTool] = useState("");
  const [source, setSource] = useState<LeadSource>("walk_in");
  const [notes, setNotes] = useState("");
  const [assign, setAssign] = useState<string>("route");
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [touched, setTouched] = useState(false);
  const toolFieldId = useId();
  const assignFieldId = useId();

  const territories = useQuery({
    queryKey: ["sales", "territories"],
    queryFn: () => salesApi.territories(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  function reset() {
    setShopName("");
    setPhone("");
    setOwnerName("");
    setEmail("");
    setAddress(EMPTY_ADDRESS);
    setChairs(1);
    setTool("");
    setSource("walk_in");
    setNotes("");
    setAssign("route");
    setDuplicates([]);
    setAllowDuplicate(false);
    setTouched(false);
  }

  // Check as the rep types — debounced, and only once there's a phone
  // number worth comparing or a pin on the map.
  const phoneDigits = phone.replace(/\D/g, "");
  useEffect(() => {
    if (!open || allowDuplicate) return;
    if (phoneDigits.length < 7 && address.latitude === null && address.address.trim().length < 8) {
      setDuplicates([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      salesApi
        .checkDuplicates({
          phone: phoneDigits.length >= 7 ? phone : null,
          address: address.address.trim() || null,
          latitude: address.latitude,
          longitude: address.longitude,
        })
        .then((r) => !cancelled && setDuplicates(r.duplicates))
        .catch(() => undefined);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, phone, phoneDigits, address, allowDuplicate]);

  const ctx = me.data;
  const myRep = ctx?.me.rep ?? null;
  const canManage = ctx?.me.canManage ?? false;
  const postalCode = postalCodeOf(address.address);
  const territory = useMemo(
    () =>
      territories.data?.territories.find((t) => postalCode && t.postalCodes.includes(postalCode)) ??
      null,
    [territories.data, postalCode],
  );
  const homeCity = ctx?.cities.find((c) => c.id === myRep?.homeCityId) ?? null;

  const toolOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "Not sure yet" },
      ...(ctx?.vocab.bookingTools ?? []).map((t) => ({ value: t, label: t })),
    ],
    [ctx?.vocab.bookingTools],
  );
  const assignOptions = useMemo<SelectOption<string>[]>(
    () => [
      {
        value: "route",
        label: territory
          ? `${territory.name} owner${territory.ownerShortName ? ` (${territory.ownerShortName})` : ""}`
          : "Route by territory",
      },
      ...(myRep ? [{ value: "me", label: "Me" }] : []),
      ...(ctx?.reps ?? [])
        .filter((r) => r.id !== myRep?.id)
        .map((r) => ({ value: r.id, label: r.name })),
      { value: "pool", label: "Unassigned pool" },
    ],
    [territory, myRep, ctx?.reps],
  );

  /**
   * A manager's "Assign to". "Route by territory" sends the territory's
   * owner (or the pool when there is none) explicitly, because a manager
   * who is also a rep would otherwise own every lead they type in.
   */
  function assignment(): { assignToRepId?: string | null } {
    if (assign === "pool") return { assignToRepId: null };
    if (assign === "me") return { assignToRepId: myRep?.id ?? null };
    if (assign !== "route") return { assignToRepId: assign };
    if (territory?.ownerRepId) return { assignToRepId: territory.ownerRepId };
    return myRep ? { assignToRepId: null } : {};
  }

  const mutation = useMutation({
    mutationFn: (logVisit: boolean) =>
      salesApi
        .createLead({
          shopName: shopName.trim(),
          phone: phone.trim() || null,
          ownerName: ownerName.trim() || null,
          email: email.trim() || null,
          address: address.address.trim() || null,
          latitude: address.latitude,
          longitude: address.longitude,
          chairs,
          currentTool: tool || null,
          source,
          notes: notes.trim() || null,
          cityId: territory?.cityId ?? homeCity?.id ?? ctx?.cities[0]?.id ?? null,
          ...(canManage ? assignment() : {}),
          allowDuplicate,
        })
        .then((detail) => ({ detail, logVisit })),
    onSuccess: ({ detail, logVisit }) => {
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      reset();
      onCreated(detail, logVisit);
    },
    onError: (error) => {
      const found = duplicatesFrom(error);
      if (found) setDuplicates(found);
    },
  });

  const valid = shopName.trim().length > 0 && phoneDigits.length >= 7;
  const blockingDuplicate = !allowDuplicate && duplicates.length > 0;
  const top = duplicates[0];

  function submit(logVisit: boolean) {
    setTouched(true);
    if (!valid) return;
    mutation.mutate(logVisit);
  }

  const assignmentLine = (() => {
    if (canManage) return null;
    if (!myRep) return <>You're not set up as a rep yet — ask a sales manager.</>;
    if (territory && territory.ownerRepId && territory.ownerRepId !== myRep.id) {
      return (
        <>
          Assigned to <b className="font-semibold text-bo-ink-soft">you</b> · {territory.name} is{" "}
          {territory.ownerShortName}
          ’s — they can claim it for {ctx?.settings.claimWindowHours ?? 48} h
        </>
      );
    }
    return (
      <>
        Assigned to <b className="font-semibold text-bo-ink-soft">{ctx?.me.name}</b>
        {territory
          ? ` · ${territory.name}${postalCode ? ` (${postalCode})` : ""}`
          : postalCode
            ? ` · ${postalCode} is outside every territory`
            : ""}
      </>
    );
  })();

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      width={580}
      label="New lead"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">New lead</h2>
          <p className="m-0 font-sans text-xs text-bo-muted-4">
            Only shop name and phone are required. Fill the rest later.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            reset();
            onClose();
          }}
          className="font-sans text-xl leading-none text-bo-muted-5"
        >
          ×
        </button>
      </div>

      {top && !allowDuplicate && (
        <div className="flex items-start gap-3 rounded-xl border border-[oklch(72%_0.09_85/0.6)] bg-bo-gold-bg px-3.5 py-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[oklch(55%_0.11_85)] font-sans text-xs font-bold text-bo-on-dark">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 mb-0.5 font-sans text-[14px] font-semibold text-bo-ink-soft">
              Possible duplicate: {top.name}
              {duplicates.length > 1 ? ` (+${duplicates.length - 1} more)` : ""}
            </p>
            <p className="m-0 mb-2 font-sans text-xs text-bo-muted-1">{describeMatch(top)}</p>
            <div className="flex flex-wrap gap-3.5">
              {top.kind === "lead" ? (
                <Link to={`/sales/leads/${top.id}`} className={linkButtonClass} onClick={onClose}>
                  Open existing lead
                </Link>
              ) : (
                <span className="font-sans text-xs text-bo-muted-2">
                  Already a shop on the platform
                </span>
              )}
              <button
                type="button"
                className="font-sans text-xs font-semibold text-bo-muted-2 hover:underline"
                onClick={() => setAllowDuplicate(true)}
              >
                Not the same shop, add anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-3.5 gap-y-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Shop name *</span>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className={inputClass}
            aria-invalid={touched && !shopName.trim()}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Phone *</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setAllowDuplicate(false);
            }}
            className={`${inputClass} ${top?.samePhone && !allowDuplicate ? "border-[oklch(60%_0.11_85)] ring-1 ring-[oklch(60%_0.11_85)]" : ""}`}
            aria-invalid={touched && phoneDigits.length < 7}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Owner name</span>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Who makes the call?"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@shop.com"
            className={inputClass}
          />
        </label>
        <div className="sm:col-span-2">
          <AddressField
            value={address}
            onChange={(v) => {
              setAddress(v);
              setAllowDuplicate(false);
            }}
            near={homeCity ? { latitude: homeCity.latitude, longitude: homeCity.longitude } : null}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Chairs</span>
          <Stepper value={chairs} onChange={setChairs} min={0} max={60} label="chairs" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={toolFieldId} className={labelClass}>
            Current booking tool
          </label>
          <Select
            id={toolFieldId}
            label="Current booking tool"
            value={tool}
            options={toolOptions}
            onChange={setTool}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>How did you find them</span>
        <div className="flex flex-wrap gap-1.5">
          {(ctx?.vocab.manualSources ?? []).map((s) => (
            <Chip key={s} active={source === s} onClick={() => setSource(s)}>
              {ctx?.vocab.sources[s] ?? s}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Owner's in after 2 PM. Two barbers rent chairs."
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </label>

      {touched && !valid && (
        <p className="m-0 font-sans text-xs text-bo-red">
          Add the shop's name and a phone number to save.
        </p>
      )}
      <ErrorNote
        error={mutation.error && !duplicatesFrom(mutation.error) ? mutation.error : null}
        fallback="Couldn't save this lead."
      />

      <div className="flex flex-col gap-3 border-t border-bo-border-soft pt-3 sm:flex-row sm:items-center sm:justify-between">
        {canManage ? (
          <div className="flex items-center gap-2 font-sans text-xs text-bo-muted-2">
            <label htmlFor={assignFieldId}>Assign to</label>
            <Select
              id={assignFieldId}
              label="Assign to"
              size="sm"
              value={assign}
              options={assignOptions}
              onChange={setAssign}
            />
          </div>
        ) : (
          <span className="font-sans text-xs text-bo-muted-2">{assignmentLine}</span>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={mutation.isPending || blockingDuplicate}
            onClick={() => submit(false)}
          >
            Save
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={mutation.isPending || blockingDuplicate}
            onClick={() => submit(true)}
          >
            {mutation.isPending ? "Saving…" : "Save & log visit"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
