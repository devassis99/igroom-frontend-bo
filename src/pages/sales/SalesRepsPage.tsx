import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import {
  Card,
  ErrorNote,
  Loading,
  RepAvatar,
  Segmented,
  inputClass,
  labelClass,
  linkButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  useSalesMe,
} from "@/components/sales/SalesUi";
import {
  salesApi,
  type City,
  type PlaceSuggestion,
  type RepRow,
  type RepType,
  type SalesSettings,
  type Territory,
} from "@/lib/sales-api";

const TYPE_PILL: Record<RepType, string> = {
  employee: "bg-bo-neutral-bg text-bo-muted-2",
  agent: "bg-bo-gold-tint text-bo-gold",
};
const TYPE_LABEL: Record<RepType, string> = { employee: "Employee", agent: "Commission agent" };
const DEFAULT_PLAN: Record<
  RepType,
  { liveBonusCents: number; mrrSharePct: number; mrrShareMonths: number }
> = {
  employee: { liveBonusCents: 4000, mrrSharePct: 0, mrrShareMonths: 0 },
  agent: { liveBonusCents: 12000, mrrSharePct: 10, mrrShareMonths: 3 },
};

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["sales"] });
}

function ModalHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">{title}</h2>
        {sub && <p className="m-0 font-sans text-xs text-bo-muted-4">{sub}</p>}
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
  );
}

function PlanFields({
  type,
  plan,
  onChange,
}: {
  type: RepType;
  plan: { liveBonusCents: number; mrrSharePct: number; mrrShareMonths: number };
  onChange: (p: { liveBonusCents: number; mrrSharePct: number; mrrShareMonths: number }) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Per live shop ($)</span>
        <input
          type="number"
          min={0}
          value={plan.liveBonusCents / 100}
          onChange={(e) =>
            onChange({ ...plan, liveBonusCents: Math.round(Number(e.target.value) * 100) })
          }
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>% of MRR</span>
        <input
          type="number"
          min={0}
          max={100}
          value={plan.mrrSharePct}
          onChange={(e) => onChange({ ...plan, mrrSharePct: Number(e.target.value) })}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>For months</span>
        <input
          type="number"
          min={0}
          max={36}
          value={plan.mrrShareMonths}
          onChange={(e) => onChange({ ...plan, mrrShareMonths: Number(e.target.value) })}
          className={inputClass}
        />
      </label>
      <p className="col-span-3 m-0 font-sans text-[11px] text-bo-muted-4">
        {type === "employee" ? "On top of salary. " : "Paid only on results. "}
        Earned when a shop takes its first online booking; payouts on the last day of each month.
      </p>
    </div>
  );
}

function InviteRepModal({
  open,
  onClose,
  territories,
}: {
  open: boolean;
  onClose: () => void;
  territories: Territory[];
}) {
  const invalidate = useInvalidate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<RepType>("employee");
  const [plan, setPlan] = useState(DEFAULT_PLAN.employee);
  const [territoryIds, setTerritoryIds] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () => salesApi.inviteRep({ name, email, type, ...plan, territoryIds }),
    onSuccess: () => {
      void invalidate();
      setName("");
      setEmail("");
      setTerritoryIds([]);
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} width={560} label="Invite rep">
      <ModalHead
        title="Invite rep"
        sub="They sign in to the back office with this Google account and see Sales only."
        onClose={onClose}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Google account email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <Segmented
        full
        value={type}
        onChange={(t) => {
          setType(t);
          setPlan(DEFAULT_PLAN[t]);
        }}
        options={[
          { value: "employee", label: "Employee" },
          { value: "agent", label: "Commission agent" },
        ]}
      />
      <p className="-mt-2 m-0 font-sans text-[11px] text-bo-muted-4">
        {type === "agent"
          ? "Agents see only their own leads and the unassigned pool."
          : "Employees can read the whole pipeline."}
      </p>
      <PlanFields type={type} plan={plan} onChange={setPlan} />
      {territories.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Territories</span>
          <div className="flex flex-wrap gap-1.5">
            {territories.map((t) => {
              const on = territoryIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTerritoryIds(
                      on ? territoryIds.filter((x) => x !== t.id) : [...territoryIds, t.id],
                    )
                  }
                  className={`rounded-full px-3 py-1.5 font-sans text-xs ${on ? "bg-bo-dark font-semibold text-bo-on-dark" : "border border-bo-input-border text-bo-ink-soft"}`}
                >
                  {t.name}
                  {t.ownerShortName && !on ? ` (${t.ownerShortName})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <ErrorNote error={mutation.error} fallback="Couldn't invite them." />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !email.includes("@")}
          className={primaryButtonClass}
        >
          Invite rep
        </button>
      </div>
    </Modal>
  );
}

function EditRepModal({ rep, onClose }: { rep: RepRow | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [type, setType] = useState<RepType>(rep?.type ?? "employee");
  const [plan, setPlan] = useState(rep?.plan ?? DEFAULT_PLAN.employee);
  const save = useMutation({
    mutationFn: (body: Parameters<typeof salesApi.updateRep>[1]) =>
      salesApi.updateRep(rep!.id, body),
    onSuccess: () => {
      void invalidate();
      onClose();
    },
  });
  if (!rep) return null;
  return (
    <Modal open onClose={onClose} width={560} label="Edit rep">
      <ModalHead
        title={rep.name}
        sub={`${rep.email}${rep.claimed ? "" : " · hasn't signed in yet"}`}
        onClose={onClose}
      />
      <Segmented
        full
        value={type}
        onChange={setType}
        options={[
          { value: "employee", label: "Employee" },
          { value: "agent", label: "Commission agent" },
        ]}
      />
      <PlanFields type={type} plan={plan} onChange={setPlan} />
      <p className="m-0 font-sans text-[11px] text-bo-muted-4">
        A new plan applies to shops that go live from now on — commission already earned stays as it
        was.
      </p>
      <ErrorNote error={save.error} fallback="Couldn't save." />
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => save.mutate({ isActive: !rep.isActive })}
          className={`${secondaryButtonClass} ${rep.isActive ? "text-bo-red" : ""}`}
          disabled={save.isPending}
          title={
            rep.isActive
              ? "Their open leads go back to the pool and their territories are freed"
              : undefined
          }
        >
          {rep.isActive ? "Deactivate" : "Reactivate"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate({ type, ...plan })}
            disabled={save.isPending}
            className={primaryButtonClass}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function newSession() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-city`;
}

function NewCityFields({ onCreated }: { onCreated: (city: City) => void }) {
  const invalidate = useInvalidate();
  const session = useMemo(newSession, []);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [radiusKm, setRadiusKm] = useState(30);
  const [found, setFound] = useState<{
    latitude: number;
    longitude: number;
    displayName: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const search = useMutation({
    mutationFn: () => salesApi.geocode(`${name} ${region}`.trim(), session),
    onSuccess: (r) => setSuggestions(r.suggestions.slice(0, 5)),
  });
  const create = useMutation({
    mutationFn: () =>
      salesApi.createCity({
        name,
        region: region || null,
        latitude: found!.latitude,
        longitude: found!.longitude,
        radiusKm,
      }),
    onSuccess: (r) => {
      void invalidate();
      onCreated(r.city);
    },
  });
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-bo-well p-3.5">
      <div className="grid grid-cols-[1fr_0.7fr_0.5fr] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="City (Austin)"
          className={inputClass}
          aria-label="City name"
        />
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="State (TX)"
          className={inputClass}
          aria-label="State or region"
        />
        <input
          type="number"
          min={1}
          max={300}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className={inputClass}
          aria-label="Radius in km"
          title="Radius (km)"
        />
      </div>
      {!found ? (
        <button
          type="button"
          className={`${secondaryButtonClass} self-start`}
          disabled={!name.trim() || search.isPending}
          onClick={() => search.mutate()}
        >
          {search.isPending ? "Finding…" : "Find it on the map"}
        </button>
      ) : (
        <p className="m-0 font-sans text-xs text-bo-muted-2">
          Centre: {found.displayName} ({found.latitude.toFixed(3)}, {found.longitude.toFixed(3)}) ·{" "}
          {radiusKm} km radius
        </p>
      )}
      {!found &&
        suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            className="text-left font-sans text-xs text-bo-ink-soft hover:underline"
            onClick={() => salesApi.geocodeRetrieve(s.id, session).then((r) => setFound(r.place))}
          >
            {s.displayName}
          </button>
        ))}
      <ErrorNote error={search.error ?? create.error} fallback="Couldn't find that city." />
      {found && (
        <button
          type="button"
          className={`${primaryButtonClass} self-start`}
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          Add {name}
        </button>
      )}
    </div>
  );
}

function TerritoryModal({
  open,
  territory,
  cities,
  reps,
  defaultCityId,
  onClose,
}: {
  open: boolean;
  territory: Territory | null;
  cities: City[];
  reps: RepRow[];
  defaultCityId: string;
  onClose: () => void;
}) {
  const invalidate = useInvalidate();
  const [cityId, setCityId] = useState(territory?.cityId ?? defaultCityId);
  const [name, setName] = useState(territory?.name ?? "");
  const [codes, setCodes] = useState(territory?.postalCodes.join(", ") ?? "");
  const [ownerRepId, setOwnerRepId] = useState(territory?.ownerRepId ?? "");
  const [addingCity, setAddingCity] = useState(cities.length === 0);
  const postalCodes = codes
    .split(/[\s,·;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const save = useMutation({
    mutationFn: () =>
      territory
        ? salesApi.updateTerritory(territory.id, {
            name,
            postalCodes,
            ownerRepId: ownerRepId || null,
          })
        : salesApi.createTerritory({ cityId, name, postalCodes, ownerRepId: ownerRepId || null }),
    onSuccess: () => {
      void invalidate();
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => salesApi.deleteTerritory(territory!.id),
    onSuccess: () => {
      void invalidate();
      onClose();
    },
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      label={territory ? "Edit territory" : "New territory"}
    >
      <ModalHead
        title={territory ? territory.name : "New territory"}
        sub="New leads route to the owner by postal code. A code can only be in one territory."
        onClose={onClose}
      />
      {!territory && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className={labelClass}>City</span>
            {!addingCity && (
              <button type="button" className={linkButtonClass} onClick={() => setAddingCity(true)}>
                + New city
              </button>
            )}
          </div>
          {addingCity ? (
            <NewCityFields
              onCreated={(c) => {
                setCityId(c.id);
                setAddingCity(false);
              }}
            />
          ) : (
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className={inputClass}
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.region ? `, ${c.region}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Austin East"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Postal codes</span>
        <input
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
          placeholder="78702, 78721, 78723"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Owner</span>
        <select
          value={ownerRepId}
          onChange={(e) => setOwnerRepId(e.target.value)}
          className={inputClass}
        >
          <option value="">Nobody — leads go to the pool</option>
          {reps
            .filter((r) => r.isActive)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {TYPE_LABEL[r.type]}
              </option>
            ))}
        </select>
      </label>
      <ErrorNote error={save.error ?? remove.error} fallback="Couldn't save the territory." />
      <div className="flex flex-wrap justify-between gap-2">
        {territory ? (
          <button
            type="button"
            onClick={() => remove.mutate()}
            className={`${secondaryButtonClass} text-bo-red`}
            disabled={remove.isPending}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim() || (!territory && (!cityId || addingCity))}
            className={primaryButtonClass}
          >
            {territory ? "Save" : "Create territory"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssignPoolModal({
  open,
  onClose,
  reps,
}: {
  open: boolean;
  onClose: () => void;
  reps: RepRow[];
}) {
  const invalidate = useInvalidate();
  const pool = useQuery({
    queryKey: ["sales", "leads", "pool-assign"],
    queryFn: () =>
      salesApi.listLeads({
        rep: "pool",
        status: "open",
        sort: "created",
        direction: "desc",
        pageSize: 100,
      }),
    enabled: open,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [repId, setRepId] = useState("");
  const assign = useMutation({
    mutationFn: () => salesApi.assignLeads(picked, repId),
    onSuccess: () => {
      void invalidate();
      setPicked([]);
      onClose();
    },
  });
  const leads = pool.data?.leads ?? [];
  return (
    <Modal open={open} onClose={onClose} width={620} label="Assign pool leads">
      <ModalHead
        title="Assign leads from the pool"
        sub={`${pool.data?.totalCount ?? 0} open leads nobody owns`}
        onClose={onClose}
      />
      {pool.isLoading && <Loading />}
      <div className="flex max-h-[340px] flex-col overflow-y-auto rounded-xl border border-bo-border">
        {leads.map((l) => {
          const on = picked.includes(l.id);
          return (
            <label
              key={l.id}
              aria-label={l.shopName}
              className="flex cursor-pointer items-center gap-3 border-b border-bo-border-soft px-3.5 py-2.5 last:border-b-0 hover:bg-bo-well"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setPicked(on ? picked.filter((x) => x !== l.id) : [...picked, l.id])
                }
                className="h-4 w-4 accent-[oklch(30%_0.02_50)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[13px] font-semibold text-bo-ink">
                  {l.shopName}
                </span>
                <span className="block truncate font-sans text-[11px] text-bo-muted-4">
                  {[l.area, l.cityName, l.sourceLabel, l.isAuto ? "auto" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </label>
          );
        })}
        {pool.data && leads.length === 0 && (
          <p className="m-0 p-4 font-sans text-sm text-bo-muted-4">The pool is empty.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className={linkButtonClass}
          onClick={() => setPicked(picked.length === leads.length ? [] : leads.map((l) => l.id))}
        >
          {picked.length === leads.length && leads.length > 0 ? "Clear" : "Select all"}
        </button>
        <div className="flex items-center gap-2">
          <select
            value={repId}
            onChange={(e) => setRepId(e.target.value)}
            className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3 py-2 font-sans text-[13px]"
            aria-label="Give to"
          >
            <option value="">Give to…</option>
            {reps
              .filter((r) => r.isActive)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className={primaryButtonClass}
            disabled={!repId || picked.length === 0 || assign.isPending}
            onClick={() => assign.mutate()}
          >
            Assign {picked.length || ""}
          </button>
        </div>
      </div>
      <ErrorNote error={assign.error} fallback="Couldn't assign them." />
    </Modal>
  );
}

type RuleKey = keyof Omit<SalesSettings, "updatedAt">;

function rulesFor(s: SalesSettings): Array<{
  k: string;
  v: string;
  edit?: { key: RuleKey; label: string; unit: string; min: number; max: number };
}> {
  return [
    {
      k: "Who owns a new lead",
      v: "The rep who adds it. Auto-created leads go to the territory owner.",
    },
    {
      k: "Ownership lock",
      v: `${s.lockDays} days after the last logged activity, then back to the pool.`,
      edit: { key: "lockDays", label: "Days", unit: "days", min: 3, max: 365 },
    },
    {
      k: "Duplicate check",
      v: `Same phone number, or an address within ${s.duplicateRadiusM} m of an existing lead or shop.`,
      edit: { key: "duplicateRadiusM", label: "Radius", unit: "metres", min: 5, max: 1000 },
    },
    {
      k: "Adding in someone else’s territory",
      v: `Allowed. The territory owner sees it on Today and can claim it within ${s.claimWindowHours} h.`,
      edit: { key: "claimWindowHours", label: "Claim window", unit: "hours", min: 1, max: 720 },
    },
    { k: "Commission agents can see", v: "Only their own leads and the unassigned pool." },
    {
      k: "Reassigning a lead",
      v: "Needs manager approval. Commission follows the rep who converts.",
    },
    {
      k: "Offers that need approval",
      v: `More than ${s.approvalDiscountPct}% off.`,
      edit: { key: "approvalDiscountPct", label: "Above", unit: "% off", min: 0, max: 100 },
    },
    {
      k: "Lost leads come back",
      v: `When asked, to the pool after ${s.lostReturnMonths} months.`,
      edit: { key: "lostReturnMonths", label: "After", unit: "months", min: 1, max: 36 },
    },
    {
      k: "Stuck in onboarding",
      v: `The rep gets a follow-up after ${s.stuckNudgeDays} days on one setup step.`,
      edit: { key: "stuckNudgeDays", label: "After", unit: "days", min: 1, max: 60 },
    },
    {
      k: "Explore turns on",
      v: `At ${s.exploreUnlockAt} live shops in a city.`,
      edit: { key: "exploreUnlockAt", label: "Live shops", unit: "shops", min: 1, max: 100 },
    },
    {
      k: "What counts as Live",
      v: "The shop takes its first online booking through its own link.",
    },
  ];
}

function RuleModal({
  rule,
  settings,
  onClose,
}: {
  rule: {
    k: string;
    edit: { key: RuleKey; label: string; unit: string; min: number; max: number };
  } | null;
  settings: SalesSettings;
  onClose: () => void;
}) {
  const invalidate = useInvalidate();
  const [value, setValue] = useState<number>(rule ? (settings[rule.edit.key] as number) : 0);
  const save = useMutation({
    mutationFn: () => salesApi.updateSettings({ [rule!.edit.key]: value }),
    onSuccess: () => {
      void invalidate();
      onClose();
    },
  });
  if (!rule) return null;
  return (
    <Modal open onClose={onClose} width={400} label={rule.k}>
      <ModalHead title={rule.k} onClose={onClose} />
      <label className="flex items-center gap-3">
        <span className={labelClass}>{rule.edit.label}</span>
        <input
          type="number"
          min={rule.edit.min}
          max={rule.edit.max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className={`${inputClass} w-28`}
        />
        <span className="font-sans text-sm text-bo-muted-3">{rule.edit.unit}</span>
      </label>
      <ErrorNote error={save.error} fallback="Couldn't save the rule." />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || value < rule.edit.min || value > rule.edit.max}
          className={primaryButtonClass}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

/**
 * B9j — Reps & Territories: who sells, where, on what terms, and the
 * rules every lead is owned by. Manager-only.
 */
export function SalesRepsPage() {
  const me = useSalesMe();
  const reps = useQuery({ queryKey: ["sales", "reps"], queryFn: salesApi.reps });
  const territories = useQuery({
    queryKey: ["sales", "territories"],
    queryFn: () => salesApi.territories(),
  });
  const [inviting, setInviting] = useState(false);
  const [editingRep, setEditingRep] = useState<RepRow | null>(null);
  const [territoryModal, setTerritoryModal] = useState<{ territory: Territory | null } | null>(
    null,
  );
  const [assigning, setAssigning] = useState(false);
  const [rule, setRule] = useState<{
    k: string;
    edit: { key: RuleKey; label: string; unit: string; min: number; max: number };
  } | null>(null);

  const cities = me.data?.cities ?? [];
  const byCity = useMemo(() => {
    const groups = new Map<string, Territory[]>();
    for (const t of territories.data?.territories ?? [])
      groups.set(t.cityName, [...(groups.get(t.cityName) ?? []), t]);
    return [...groups.entries()];
  }, [territories.data]);
  const month = new Date().toLocaleDateString("en-US", { month: "short" });
  const settings = me.data?.settings;

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Reps &amp; Territories</h1>
        <div className="flex gap-2.5">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setTerritoryModal({ territory: null })}
          >
            New territory
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => setInviting(true)}>
            + Invite rep
          </button>
        </div>
      </div>
      <ErrorNote error={reps.error ?? territories.error} fallback="Couldn't load the team." />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.5fr)_minmax(0,0.6fr)_minmax(0,1.5fr)] gap-3 bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4 md:grid">
              <span>Rep</span>
              <span>Type</span>
              <span>Territories</span>
              <span>Open</span>
              <span>Live ({month})</span>
              <span>Commission plan</span>
            </div>
            {reps.isLoading && <Loading />}
            {(reps.data?.reps ?? []).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setEditingRep(r)}
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-bo-border-soft px-5 py-3 text-left hover:bg-bo-well md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.5fr)_minmax(0,0.6fr)_minmax(0,1.5fr)] ${r.isActive ? "" : "opacity-55"}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <RepAvatar type={r.type} initials={r.initials} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[13px] font-semibold text-bo-ink">
                      {r.name}
                    </span>
                    <span className="block truncate font-sans text-[11px] text-bo-muted-4">
                      {!r.isActive ? "Deactivated · " : !r.claimed ? "Invited · " : ""}
                      {r.email}
                    </span>
                  </span>
                </span>
                <span
                  className={`w-fit rounded-full px-[9px] py-[3px] font-sans text-[11px] font-semibold whitespace-nowrap ${TYPE_PILL[r.type]}`}
                >
                  {TYPE_LABEL[r.type]}
                </span>
                <span className="col-span-2 flex flex-wrap gap-1 md:col-span-1">
                  {r.territories.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-md bg-[oklch(94%_0.012_70)] px-2 py-0.5 font-sans text-[11px] font-medium text-bo-muted-1"
                    >
                      {t.name}
                    </span>
                  ))}
                  {r.territories.length === 0 && (
                    <span className="font-sans text-[11px] text-bo-muted-5">No territory</span>
                  )}
                </span>
                <span className="hidden font-sans text-[13px] font-semibold text-bo-ink-soft md:block">
                  {r.openLeads}
                </span>
                <span className="hidden font-sans text-[13px] font-semibold text-bo-ink-soft md:block">
                  {r.liveThisMonth}
                </span>
                <span className="col-span-2 font-sans text-xs text-bo-muted-2 md:col-span-1">
                  {r.planLabel}
                </span>
              </button>
            ))}
            {reps.data && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-bo-footer px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <RepAvatar size={28} />
                  <div>
                    <p className="m-0 font-sans text-[13px] font-semibold text-bo-ink">
                      Unassigned pool · {reps.data.pool.openLeads} leads
                    </p>
                    {reps.data.pool.citiesWithoutRep.length > 0 && (
                      <p className="m-0 font-sans text-[11px] text-bo-red">
                        {reps.data.pool.citiesWithoutRep.join(", ")}{" "}
                        {reps.data.pool.citiesWithoutRep.length === 1 ? "has" : "have"} no rep yet
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={linkButtonClass}
                  onClick={() => setAssigning(true)}
                  disabled={reps.data.pool.openLeads === 0}
                >
                  Assign leads
                </button>
              </div>
            )}
          </Card>

          {byCity.length === 0 && territories.data && (
            <Card className="p-5 font-sans text-sm text-bo-muted-2">
              No territories yet. Create one to route new leads to a rep by postal code.
            </Card>
          )}
          {byCity.map(([cityName, list]) => (
            <Card key={cityName} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bo-border-soft px-5 py-3.5">
                <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">
                  Territories · {cityName}
                </p>
                <span className="font-sans text-xs text-bo-muted-4">
                  New leads route by postal code
                </span>
              </div>
              {list.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTerritoryModal({ territory: t })}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-bo-border-soft px-5 py-2.5 text-left last:border-b-0 hover:bg-bo-well sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.5fr)]"
                >
                  <span className="font-sans text-[13px] font-semibold text-bo-ink">{t.name}</span>
                  <span className="order-last col-span-2 font-sans text-xs text-bo-muted-3 sm:order-none sm:col-span-1">
                    {t.postalCodes.join(" · ") || "No postal codes"}
                  </span>
                  <span
                    className={`font-sans text-xs font-medium ${t.ownerShortName ? "text-bo-ink-soft" : "text-bo-red"}`}
                  >
                    {t.ownerShortName ?? "No owner"}
                  </span>
                  <span className="hidden text-right font-sans text-xs font-semibold text-bo-ink-soft sm:block">
                    {t.openLeads}
                  </span>
                </button>
              ))}
            </Card>
          ))}
        </div>

        {settings && (
          <Card className="overflow-hidden">
            <p className="m-0 border-b border-bo-border-soft px-4.5 py-3.5 font-sans text-[15px] font-semibold text-bo-ink">
              Ownership rules
            </p>
            {rulesFor(settings).map((r) => (
              <button
                key={r.k}
                type="button"
                disabled={!r.edit}
                onClick={() => r.edit && setRule({ k: r.k, edit: r.edit })}
                className="flex w-full items-center justify-between gap-3.5 border-b border-bo-border-soft px-4.5 py-3 text-left last:border-b-0 enabled:hover:bg-bo-well"
              >
                <span className="min-w-0">
                  <span className="mb-0.5 block font-sans text-[13px] font-medium text-bo-ink-soft">
                    {r.k}
                  </span>
                  <span className="block font-sans text-xs text-bo-muted-4">{r.v}</span>
                </span>
                {r.edit && <span className="font-sans text-sm text-bo-faint">›</span>}
              </button>
            ))}
          </Card>
        )}
      </div>

      <InviteRepModal
        open={inviting}
        onClose={() => setInviting(false)}
        territories={territories.data?.territories ?? []}
      />
      {editingRep && (
        <EditRepModal key={editingRep.id} rep={editingRep} onClose={() => setEditingRep(null)} />
      )}
      {territoryModal && (
        <TerritoryModal
          key={territoryModal.territory?.id ?? "new"}
          open
          territory={territoryModal.territory}
          cities={cities}
          reps={reps.data?.reps ?? []}
          defaultCityId={cities[0]?.id ?? ""}
          onClose={() => setTerritoryModal(null)}
        />
      )}
      <AssignPoolModal
        open={assigning}
        onClose={() => setAssigning(false)}
        reps={reps.data?.reps ?? []}
      />
      {rule && settings && (
        <RuleModal key={rule.k} rule={rule} settings={settings} onClose={() => setRule(null)} />
      )}
    </div>
  );
}

export default SalesRepsPage;
