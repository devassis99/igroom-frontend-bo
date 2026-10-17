import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { LogActivityModal } from "@/components/sales/ActivityComposer";
import { CloseLeadModal } from "@/components/sales/CloseLeadModal";
import { NewLeadModal } from "@/components/sales/NewLeadModal";
import {
  Card,
  DensityMeter,
  DueText,
  ErrorNote,
  ExplorePill,
  Loading,
  PageHeader,
  StatusBadge,
  densityLine,
  inputClass,
  linkButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  smallButtonClass,
  useSalesMe,
} from "@/components/sales/SalesUi";
import {
  directionsHref,
  formatMoney,
  salesApi,
  telHref,
  type Lead,
  type TodayResponse,
} from "@/lib/sales-api";

/** The line under a shop on Today: the follow-up's note, else what's known about where it came from. */
function taskLine(lead: Lead): string {
  return (
    lead.nextFollowUpNote ??
    (lead.isAuto || lead.source === "csv_import" ? lead.sourceDetail : null) ??
    lead.lastActivity?.summary ??
    lead.sourceDetail ??
    (lead.status === "new" ? "First contact." : "Follow up.")
  );
}

function TodayRow({
  lead,
  showRep,
  onLog,
  fresh,
}: {
  lead: Lead;
  showRep: boolean;
  onLog: (lead: Lead) => void;
  fresh?: boolean;
}) {
  const navigate = useNavigate();
  const directions = directionsHref(lead);
  return (
    <div className="border-b border-bo-border-soft last:border-b-0">
      {/* Desktop row — B9a */}
      <div className="hidden grid-cols-[112px_minmax(0,1fr)_84px_auto] items-center gap-4 px-5 py-3 md:grid">
        <StatusBadge status={lead.status} label={lead.statusLabel} />
        <button
          type="button"
          onClick={() => navigate(`/sales/leads/${lead.id}`)}
          className="min-w-0 text-left"
        >
          <p className="m-0 mb-0.5 truncate font-sans text-[13px] font-semibold text-bo-ink">
            {lead.shopName}{" "}
            <span className="font-normal text-bo-muted-5">
              {lead.area ? `· ${lead.area}` : ""}
              {showRep && lead.rep ? ` · ${lead.rep.shortName}` : ""}
            </span>
          </p>
          <p className="m-0 truncate font-sans text-xs text-bo-muted-2">{taskLine(lead)}</p>
        </button>
        {fresh ? (
          <span className="text-right font-sans text-xs font-semibold text-bo-gold">New</span>
        ) : (
          <DueText at={lead.nextFollowUpAt} className="text-right" />
        )}
        <div className="flex gap-1.5">
          {lead.phone ? (
            <a href={telHref(lead.phone)} className={smallButtonClass}>
              Call
            </a>
          ) : (
            <span className={`${smallButtonClass} opacity-40`} title="No phone number yet">
              Call
            </span>
          )}
          <button type="button" className={smallButtonClass} onClick={() => onLog(lead)}>
            Log
          </button>
        </div>
      </div>

      {/* Phone card — B9l */}
      <div className="flex flex-col gap-2 p-3.5 md:hidden">
        <div className="flex items-center justify-between">
          <StatusBadge status={lead.status} label={lead.statusLabel} />
          {fresh ? (
            <span className="font-sans text-xs font-semibold text-bo-gold">New</span>
          ) : (
            <DueText at={lead.nextFollowUpAt} />
          )}
        </div>
        <Link to={`/sales/leads/${lead.id}`} className="block">
          <p className="m-0 mb-0.5 font-sans text-[15px] font-semibold text-bo-ink">
            {lead.shopName}
          </p>
          <p className="m-0 font-sans text-[13px] text-bo-muted-2">{taskLine(lead)}</p>
        </Link>
        <div className="grid grid-cols-3 gap-1.5">
          <a
            href={lead.phone ? telHref(lead.phone) : undefined}
            aria-disabled={!lead.phone}
            className={`flex h-10 items-center justify-center rounded-[10px] border border-bo-input-border font-sans text-[13px] font-semibold text-bo-ink-soft ${lead.phone ? "" : "pointer-events-none opacity-40"}`}
          >
            Call
          </a>
          <a
            href={directions ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!directions}
            className={`flex h-10 items-center justify-center rounded-[10px] border border-bo-input-border font-sans text-[13px] font-semibold text-bo-ink-soft ${directions ? "" : "pointer-events-none opacity-40"}`}
          >
            Directions
          </a>
          <button
            type="button"
            onClick={() => onLog(lead)}
            className="flex h-10 items-center justify-center rounded-[10px] border border-bo-input-border font-sans text-[13px] font-semibold text-bo-ink-soft"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  sub,
  tone,
  leads,
  showRep,
  onLog,
  fresh,
  footer,
  empty,
}: {
  title: string;
  sub: string;
  tone?: "danger";
  leads: Lead[];
  showRep: boolean;
  onLog: (lead: Lead) => void;
  fresh?: boolean;
  footer?: React.ReactNode;
  empty?: string;
}) {
  if (leads.length === 0 && !footer && !empty) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-bo-border-soft px-5 py-3.5">
        <p
          className={`m-0 font-sans text-[15px] font-semibold ${tone === "danger" ? "text-bo-red" : "text-bo-ink"}`}
        >
          {title}
        </p>
        <span className="font-sans text-xs text-bo-muted-4">{sub}</span>
      </div>
      {leads.map((lead) => (
        <TodayRow key={lead.id} lead={lead} showRep={showRep} onLog={onLog} fresh={fresh} />
      ))}
      {leads.length === 0 && empty && (
        <p className="m-0 px-5 py-4 font-sans text-xs text-bo-muted-4">{empty}</p>
      )}
      {footer}
    </Card>
  );
}

function ClaimFooter({ data }: { data: TodayResponse }) {
  const queryClient = useQueryClient();
  const claim = useMutation({
    mutationFn: (id: string) => salesApi.claimLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales"] }),
  });
  const items = [
    ...data.claimable.map((c) => ({ ...c, why: "added in your territory by another rep" })),
    ...data.poolInMyTerritories.map((p) => ({
      id: p.id,
      shopName: p.shopName,
      why: `unassigned in ${p.territoryName}`,
    })),
  ];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 bg-bo-footer px-5 py-2.5">
      {items.slice(0, 4).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate font-sans text-xs text-bo-muted-2">
            <Link
              to={`/sales/leads/${item.id}`}
              className="font-semibold text-bo-ink-soft hover:underline"
            >
              {item.shopName}
            </Link>{" "}
            · {item.why}
          </span>
          <button
            type="button"
            className={linkButtonClass}
            disabled={claim.isPending}
            onClick={() => claim.mutate(item.id)}
          >
            Claim
          </button>
        </div>
      ))}
      {items.length > 4 && (
        <span className="font-sans text-xs text-bo-muted-4">
          and {items.length - 4} more in the pool
        </span>
      )}
      <ErrorNote error={claim.error} fallback="Couldn't claim it." />
    </div>
  );
}

function Approvals({ data }: { data: TodayResponse }) {
  const queryClient = useQueryClient();
  const decideInvite = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      salesApi.decideInvite(id, approve),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales"] }),
  });
  const decideReassignment = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      salesApi.decideReassignment(id, approve),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales"] }),
  });
  const a = data.approvals;
  if (!a || (a.invites.length === 0 && a.reassignments.length === 0)) return null;
  return (
    <Card className="overflow-hidden border-[oklch(72%_0.09_85/0.6)]">
      <div className="flex items-baseline gap-2.5 border-b border-bo-border-soft bg-bo-gold-bg px-5 py-3.5">
        <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">Waiting on you</p>
        <span className="font-sans text-xs text-bo-muted-2">
          {a.invites.length + a.reassignments.length} to decide
        </span>
      </div>
      {a.invites.map((i) => (
        <div
          key={i.id}
          className="flex flex-col gap-2 border-b border-bo-border-soft px-5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="m-0 font-sans text-[13px] font-semibold text-bo-ink">
              <Link to={`/sales/leads/${i.leadId}`} className="hover:underline">
                {i.shopName}
              </Link>{" "}
              <span className="font-normal text-bo-muted-4">
                · offer from {i.requestedByName ?? "a rep"}
              </span>
            </p>
            <p className="m-0 font-sans text-xs text-bo-muted-2">{i.offer}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={smallButtonClass}
              disabled={decideInvite.isPending}
              onClick={() => decideInvite.mutate({ id: i.id, approve: false })}
            >
              Decline
            </button>
            <button
              type="button"
              className="rounded-lg bg-bo-dark px-3 py-1.5 font-sans text-xs font-semibold text-bo-on-dark disabled:opacity-50"
              disabled={decideInvite.isPending}
              onClick={() => decideInvite.mutate({ id: i.id, approve: true })}
            >
              Approve & send
            </button>
          </div>
        </div>
      ))}
      {a.reassignments.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-2 border-b border-bo-border-soft px-5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="m-0 font-sans text-[13px] font-semibold text-bo-ink">
              <Link to={`/sales/leads/${r.leadId}`} className="hover:underline">
                {r.shopName}
              </Link>{" "}
              <span className="font-normal text-bo-muted-4">
                · {r.fromRepName ?? "Pool"} → {r.toRepName ?? "?"}
              </span>
            </p>
            <p className="m-0 font-sans text-xs text-bo-muted-2">
              {r.reason ?? `Asked by ${r.requestedByName ?? "a rep"}`}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={smallButtonClass}
              disabled={decideReassignment.isPending}
              onClick={() => decideReassignment.mutate({ id: r.id, approve: false })}
            >
              Decline
            </button>
            <button
              type="button"
              className="rounded-lg bg-bo-dark px-3 py-1.5 font-sans text-xs font-semibold text-bo-on-dark disabled:opacity-50"
              disabled={decideReassignment.isPending}
              onClick={() => decideReassignment.mutate({ id: r.id, approve: true })}
            >
              Approve
            </button>
          </div>
        </div>
      ))}
      <div className="px-5 pb-3">
        <ErrorNote
          error={decideInvite.error ?? decideReassignment.error}
          fallback="Couldn't save that decision."
        />
      </div>
    </Card>
  );
}

/** "Log activity" from the header: pick which of your leads first. */
function PickLeadModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (lead: Lead) => void;
}) {
  const [q, setQ] = useState("");
  const results = useQuery({
    queryKey: ["sales", "pick", q],
    queryFn: () =>
      salesApi.listLeads({
        rep: "me",
        q: q || undefined,
        status: "all",
        sort: "last_activity",
        pageSize: 8,
      }),
    enabled: open,
  });
  return (
    <Modal open={open} onClose={onClose} label="Log activity">
      <div className="flex items-start justify-between">
        <h2 className="m-0 font-sans text-xl font-semibold text-bo-ink">Log activity</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="font-sans text-xl leading-none text-bo-muted-5"
        >
          ×
        </button>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your leads — shop, owner or phone"
        className={inputClass}
      />
      <div className="flex flex-col">
        {(results.data?.leads ?? []).map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => onPick(lead)}
            className="flex items-center justify-between gap-3 border-b border-bo-border-soft px-1 py-2.5 text-left last:border-b-0 hover:bg-bo-well"
          >
            <span className="min-w-0 truncate font-sans text-[13px] font-semibold text-bo-ink">
              {lead.shopName}{" "}
              <span className="font-normal text-bo-muted-5">
                {lead.area ? `· ${lead.area}` : ""}
              </span>
            </span>
            <StatusBadge status={lead.status} label={lead.statusLabel} size="sm" />
          </button>
        ))}
        {results.data && results.data.leads.length === 0 && (
          <p className="m-0 py-3 font-sans text-xs text-bo-muted-4">No leads of yours match.</p>
        )}
      </div>
    </Modal>
  );
}

/**
 * B9a — Today. A rep's day: overdue follow-ups, today's, and leads that
 * landed on them without their asking (imports, routed signups, a
 * manager's assignment). A manager with no rep profile sees the team's
 * day and what's waiting for their approval instead.
 */
export function SalesTodayPage() {
  const me = useSalesMe();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useQuery({
    queryKey: ["sales", "today"],
    queryFn: salesApi.today,
    refetchInterval: 120_000,
  });
  const [logFor, setLogFor] = useState<Lead | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [closeFor, setCloseFor] = useState<Lead | null>(null);
  const [picking, setPicking] = useState(false);
  const newOpen = searchParams.get("new") === "1";
  const setNewOpen = (open: boolean) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (open) next.set("new", "1");
      else next.delete("new");
      return next;
    });

  const data = today.data;
  const showRep = data?.scope === "team";
  const dateLine = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const territoryLine = data?.rep?.territories.map((t) => t.name).join(", ");
  const nothing =
    data && data.overdue.length === 0 && data.dueToday.length === 0 && data.newForYou.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Today"
        subtitle={[dateLine, territoryLine || (showRep ? "Whole team" : null)]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            {me.data?.me.rep && (
              <button
                type="button"
                className={`${secondaryButtonClass} hidden sm:inline-block`}
                onClick={() => setPicking(true)}
              >
                Log activity
              </button>
            )}
            <button
              type="button"
              className={`${primaryButtonClass} hidden md:inline-block`}
              onClick={() => setNewOpen(true)}
            >
              + New lead
            </button>
          </>
        }
      />

      {today.isLoading && <Loading />}
      <ErrorNote error={today.error} fallback="Couldn't load today." />

      {data && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            {data.scope === "none" && (
              <Card className="p-5 font-sans text-sm text-bo-muted-2">
                You're not set up as a rep yet, so there's no Today list for you. A sales manager
                can add you on Reps & Territories.
              </Card>
            )}
            <Approvals data={data} />
            <Section
              title="Overdue"
              sub={`${data.overdue.length} follow-up${data.overdue.length === 1 ? "" : "s"}`}
              tone="danger"
              leads={data.overdue}
              showRep={showRep}
              onLog={setLogFor}
            />
            <Section
              title="Due today"
              sub={`${data.dueToday.length} follow-up${data.dueToday.length === 1 ? "" : "s"}`}
              leads={data.dueToday}
              showRep={showRep}
              onLog={setLogFor}
              empty={data.scope !== "none" ? "Nothing else due today." : undefined}
            />
            <Section
              title="New for you"
              sub={
                data.scope === "team"
                  ? "Created automatically from stalled signups — in the pool until someone takes them"
                  : "Assigned to you — imports, signups and referrals in your territory"
              }
              leads={data.newForYou}
              showRep={showRep}
              onLog={setLogFor}
              fresh
              footer={<ClaimFooter data={data} />}
            />
            {nothing &&
              data.scope === "mine" &&
              data.claimable.length === 0 &&
              data.poolInMyTerritories.length === 0 && (
                <Card className="p-5 font-sans text-sm text-bo-muted-2">
                  You're clear for today. Walk your territory, or{" "}
                  <Link to="/sales/map" className="font-semibold text-bo-gold">
                    open the map
                  </Link>{" "}
                  to see what's nearby.
                </Card>
              )}
          </div>

          <div className="flex flex-col gap-4">
            {data.density && (
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">
                    {data.density.cityName} density
                  </p>
                  <ExplorePill on={data.density.exploreOn} />
                </div>
                <p className="m-0 font-sans text-[30px] font-bold text-bo-ink">
                  {data.density.liveShops}{" "}
                  <span className="font-sans text-sm font-normal text-bo-muted-4">
                    / {data.density.unlockAt} live shops
                  </span>
                </p>
                <DensityMeter
                  live={data.density.liveShops}
                  onboarding={data.density.onboarding}
                  unlockAt={data.density.unlockAt}
                />
                <p className="m-0 font-sans text-xs text-bo-muted-2">
                  {densityLine(data.density)}{" "}
                  {data.density.onboardingNames.length > 0 &&
                    `${data.density.onboardingNames.join(" and ")} ${data.density.onboardingNames.length === 1 ? "is" : "are"} onboarding.`}
                </p>
                <p className="m-0 font-sans text-[11px] text-bo-muted-5">
                  Live = taking online bookings, with opening hours set.
                </p>
              </Card>
            )}
            {data.week && (
              <Card className="p-5">
                <p className="m-0 mb-3.5 font-sans text-[15px] font-semibold text-bo-ink">
                  My week
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  {[
                    ["Visits logged", String(data.week.visits)],
                    ["Demos held", String(data.week.demos)],
                    ["Went live", String(data.week.live)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="font-sans text-xs text-bo-muted-4">{label}</span>
                      <p className="m-0 mt-1 font-sans text-[22px] font-bold text-bo-ink">
                        {value}
                      </p>
                    </div>
                  ))}
                  <div>
                    <span className="font-sans text-xs text-bo-muted-4">Commission</span>
                    <p className="m-0 mt-1 font-sans text-[22px] font-bold text-bo-ink">
                      {formatMoney(data.week.commissionPendingCents, data.week.currency)}{" "}
                      <span className="font-sans text-[11px] font-medium text-bo-muted-4">
                        pending
                      </span>
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* The phone's "+ Lead" button (B9l), above the tab bar. */}
      <button
        type="button"
        onClick={() => setNewOpen(true)}
        className="fixed right-5 bottom-[88px] z-30 flex h-14 items-center rounded-full bg-bo-dark px-5.5 font-sans text-[15px] font-semibold text-bo-on-dark shadow-[0_10px_24px_-8px_rgba(20,15,5,0.5)] md:hidden"
      >
        + Lead
      </button>

      <NewLeadModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(detail, logVisit) => {
          setNewOpen(false);
          if (logVisit) {
            setSavedId(detail.lead.id);
            setLogFor(detail.lead);
          } else navigate(`/sales/leads/${detail.lead.id}`);
        }}
      />
      <PickLeadModal
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(lead) => {
          setPicking(false);
          setLogFor(lead);
        }}
      />
      <LogActivityModal
        lead={logFor}
        onClose={() => setLogFor(null)}
        onWantsClose={() => {
          setCloseFor(logFor);
          setLogFor(null);
        }}
        justSaved={logFor !== null && logFor.id === savedId}
      />
      <CloseLeadModal lead={closeFor} onClose={() => setCloseFor(null)} />
    </div>
  );
}

export default SalesTodayPage;
