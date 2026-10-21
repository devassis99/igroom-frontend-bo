import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TileMap, type MapPoint } from "@/components/sales/TileMap";
import {
  Card,
  DensityMeter,
  DueText,
  ErrorNote,
  ExplorePill,
  Loading,
  StatusBadge,
  densityLine,
  linkButtonClass,
  useSalesMe,
} from "@/components/sales/SalesUi";
import { chairsLabel, salesApi, type MapPin } from "@/lib/sales-api";

const PIN_COLORS: Record<MapPin["category"], string> = {
  live: "oklch(55% 0.14 145)",
  onboarding: "oklch(55% 0.09 200)",
  pipeline: "oklch(64% 0.11 85)",
  new: "oklch(62% 0.02 60)",
  closed: "oklch(64% 0.12 25)",
};

const LEGEND: Array<[MapPin["category"], string]> = [
  ["live", "Live"],
  ["onboarding", "Onboarding"],
  ["pipeline", "In pipeline"],
  ["new", "New"],
  ["closed", "Lost / not now"],
];

/**
 * B9i — City Map. Every lead with a pin and every live shop in the city,
 * coloured by where it stands, with the density meter that says how far
 * the city is from being worth turning Explore on for.
 */
export function SalesMapPage() {
  const me = useSalesMe();
  const [searchParams, setSearchParams] = useSearchParams();
  const cities = me.data?.cities ?? [];
  const cityId = searchParams.get("city") ?? me.data?.me.rep?.homeCityId ?? cities[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<MapPin["category"]>>(new Set());

  const map = useQuery({
    queryKey: ["sales", "map", cityId],
    queryFn: () => salesApi.map(cityId),
    enabled: !!cityId,
    placeholderData: keepPreviousData,
  });
  const data = map.data;

  const points: MapPoint[] = useMemo(
    () =>
      (data?.pins ?? [])
        .filter((p) => !hidden.has(p.category))
        .map((p) => ({
          id: p.id,
          latitude: p.latitude,
          longitude: p.longitude,
          color: PIN_COLORS[p.category],
          name: p.name,
          // Names beside the pins that matter most; the rest on click.
          labelled: p.category === "live" || p.category === "onboarding",
        })),
    [data, hidden],
  );
  const selected = data?.pins.find((p) => p.id === selectedId) ?? null;

  if (!me.isLoading && cities.length === 0) {
    return (
      <Card className="p-8 font-sans text-sm text-bo-muted-2">
        No cities are set up yet. A sales manager adds them on{" "}
        <Link to="/sales/reps" className="font-semibold text-bo-gold">
          Reps & Territories
        </Link>
        .
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-56px)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">City Map</h1>
          <select
            value={cityId}
            onChange={(e) => {
              setSelectedId(null);
              setSearchParams({ city: e.target.value });
            }}
            className="rounded-[10px] border border-bo-input-border bg-bo-field px-3 py-[7px] font-sans text-[14px] font-medium text-bo-ink-soft"
            aria-label="City"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.region ? `, ${c.region}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3.5">
          {LEGEND.map(([cat, label]) => (
            <button
              key={cat}
              type="button"
              aria-pressed={!hidden.has(cat)}
              onClick={() =>
                setHidden((h) => {
                  const next = new Set(h);
                  if (next.has(cat)) next.delete(cat);
                  else next.add(cat);
                  return next;
                })
              }
              className={`flex items-center gap-1.5 font-sans text-xs font-medium ${hidden.has(cat) ? "text-bo-muted-6 line-through" : "text-bo-muted-2"}`}
              title={hidden.has(cat) ? `Show ${label}` : `Hide ${label}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_COLORS[cat] }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote error={map.error} fallback="Couldn't load the map." />
      {map.isLoading && <Loading />}

      {data && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[420px] overflow-hidden rounded-[14px] border border-bo-border lg:h-auto">
            <TileMap
              points={points}
              fallback={data.city}
              selectedId={selectedId}
              onSelect={setSelectedId}
              popup={
                selected && (
                  <div className="flex flex-col gap-1.5 rounded-xl bg-bo-surface px-3.5 py-3 shadow-[0_12px_30px_-10px_rgba(20,15,5,0.35)]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-sans text-[14px] font-semibold text-bo-ink">
                        {selected.name}
                      </span>
                      <StatusBadge
                        status={selected.status}
                        label={selected.statusLabel}
                        size="sm"
                      />
                    </div>
                    <span className="font-sans text-[12px] text-bo-muted-3">
                      {[
                        selected.address?.split(",")[0],
                        chairsLabel(selected.chairs),
                        selected.repShortName,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        (selected.kind === "shop" ? "On iGroom — not from a lead" : "")}
                    </span>
                    {selected.nextFollowUpAt && (
                      <span className="font-sans text-[12px]">
                        <DueText at={selected.nextFollowUpAt} className="text-[12px]" />{" "}
                        <span className="text-bo-muted-3">{selected.nextFollowUpNote ?? ""}</span>
                      </span>
                    )}
                    {selected.kind === "lead" ? (
                      <Link to={`/sales/leads/${selected.id}`} className={linkButtonClass}>
                        Open lead
                      </Link>
                    ) : (
                      me.data?.me.canManage && (
                        <Link to={`/shops/${selected.id}`} className={linkButtonClass}>
                          Open shop
                        </Link>
                      )
                    )}
                  </div>
                )
              }
            />
          </div>

          <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto">
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <p className="m-0 font-sans text-[16px] font-semibold text-bo-ink">
                  {data.density.cityName} density
                </p>
                <ExplorePill on={data.density.exploreOn} />
              </div>
              <p className="m-0 font-sans text-[30px] font-bold text-bo-ink">
                {data.density.liveShops}{" "}
                <span className="text-sm font-normal text-bo-muted-4">
                  / {data.density.unlockAt} live shops
                </span>
              </p>
              <DensityMeter
                live={data.density.liveShops}
                onboarding={data.density.onboarding}
                unlockAt={data.density.unlockAt}
                height={12}
              />
              <p className="m-0 font-sans text-xs text-bo-muted-2">{densityLine(data.density)}</p>
            </Card>

            <Card className="flex flex-col gap-2.5 px-5 py-4.5">
              <p className="m-0 font-sans text-sm font-semibold text-bo-ink">Closest to live</p>
              {data.closestToLive.length === 0 && (
                <p className="m-0 font-sans text-xs text-bo-muted-4">
                  Nothing onboarding or past a demo yet.
                </p>
              )}
              {data.closestToLive.map((c) => (
                <Link
                  key={c.id}
                  to={`/sales/leads/${c.id}`}
                  className="flex items-start justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-sans text-[14px] font-semibold text-bo-ink hover:underline">
                      {c.shopName}
                    </p>
                    <p
                      className={`m-0 font-sans text-[12px] ${c.stuck ? "text-bo-red" : "text-bo-muted-4"}`}
                    >
                      {c.line}
                    </p>
                  </div>
                  <StatusBadge status={c.status} label={c.statusLabel} />
                </Link>
              ))}
            </Card>

            {data.otherCities.length > 0 && (
              <Card className="flex flex-col gap-3 px-5 py-4.5">
                <p className="m-0 font-sans text-sm font-semibold text-bo-ink">Other cities</p>
                {data.otherCities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Open ${c.name}`}
                    onClick={() => {
                      setSelectedId(null);
                      setSearchParams({ city: c.id });
                    }}
                    className="flex flex-col gap-1.5 text-left"
                  >
                    <div className="flex w-full justify-between">
                      <span className="font-sans text-xs font-semibold text-bo-ink-soft">
                        {c.name}
                      </span>
                      <span
                        className={`font-sans text-[12px] font-medium ${!c.hasRep ? "text-bo-red" : c.exploreOn ? "text-bo-success" : "text-bo-muted-4"}`}
                      >
                        {c.liveShops} / {c.unlockAt}
                        {!c.hasRep ? " · No rep" : c.exploreOn ? " · Explore on" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-bo-border-soft">
                      <div
                        className="h-full rounded-[3px] bg-[oklch(55%_0.13_145)]"
                        style={{
                          width: `${Math.min(100, Math.round((c.liveShops / c.unlockAt) * 100))}%`,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesMapPage;
