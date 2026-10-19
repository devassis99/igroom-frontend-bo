import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { env } from "@/lib/env";

/**
 * A small slippy map — raster tiles, pins, drag to pan, buttons and the
 * wheel to zoom — written out rather than pulled in as a library, because
 * the City Map needs exactly this much and nothing more. Web Mercator,
 * 256 px tiles.
 *
 * Tiles come from Mapbox when VITE_MAPBOX_ACCESS_TOKEN is set (the same
 * token and style the tenant app's location picker uses), and from
 * OpenStreetMap's standard tiles otherwise — fine for an internal tool's
 * traffic, and credited as their policy asks.
 */

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  /** Accessible name, and the label when one is shown. */
  name: string;
  /** Show the name beside the pin once the map is zoomed in far enough to have room for it. */
  labelled?: boolean;
}

/** Below this zoom a city's worth of names would sit on top of each other. */
const LABEL_ZOOM = 13;

function project(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function tileUrl(z: number, x: number, y: number) {
  const token = env.VITE_MAPBOX_ACCESS_TOKEN;
  if (token) {
    return `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/${z}/${x}/${y}@2x?access_token=${token}`;
  }
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/** The zoom that fits every point (or the fallback circle) inside the box, with some padding. */
function fitZoom(
  points: Array<{ latitude: number; longitude: number }>,
  width: number,
  height: number,
) {
  if (points.length < 2 || width === 0) return 12;
  for (let z = 16; z >= MIN_ZOOM; z--) {
    const ps = points.map((p) => project(p.latitude, p.longitude, z));
    const w = Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
    const h = Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y));
    if (w <= width - 80 && h <= height - 80) return z;
  }
  return MIN_ZOOM;
}

export function TileMap({
  points,
  fallback,
  selectedId,
  onSelect,
  popup,
}: {
  points: MapPoint[];
  /** Where to look when there are no points yet — the city's centre and radius. */
  fallback: { latitude: number; longitude: number; radiusKm: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Rendered next to the selected point. */
  popup?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(
    null,
  );

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fit the view to the points whenever the set of points (a new city)
  // changes — not on every refetch of the same city.
  const signature = useMemo(
    () =>
      points
        .map((p) => p.id)
        .sort()
        .join(","),
    [points],
  );
  const fallbackKey = `${fallback.latitude},${fallback.longitude}`;
  useEffect(() => {
    if (size.width === 0) return;
    const fitPoints =
      points.length >= 2
        ? points
        : [
            // The city's radius as a box: ~1 degree of latitude is 111 km.
            {
              latitude: fallback.latitude + fallback.radiusKm / 111 / 2,
              longitude: fallback.longitude,
            },
            {
              latitude: fallback.latitude - fallback.radiusKm / 111 / 2,
              longitude: fallback.longitude,
            },
          ];
    const lat = points.length
      ? points.reduce((s, p) => s + p.latitude, 0) / points.length
      : fallback.latitude;
    const lng = points.length
      ? points.reduce((s, p) => s + p.longitude, 0) / points.length
      : fallback.longitude;
    const zoom = fitZoom(fitPoints, size.width, size.height);
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    setView({
      lat: points.length >= 2 ? (Math.max(...lats) + Math.min(...lats)) / 2 : lat,
      lng: points.length >= 2 ? (Math.max(...lngs) + Math.min(...lngs)) / 2 : lng,
      zoom,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, fallbackKey, size.width > 0]);

  if (!view) {
    return (
      <div ref={box} className="relative h-full min-h-[320px] w-full bg-[oklch(95.5%_0.01_80)]" />
    );
  }

  const center = project(view.lat, view.lng, view.zoom);
  const left = center.x - size.width / 2;
  const top = center.y - size.height / 2;
  const n = 2 ** view.zoom;
  const tiles: Array<{ key: string; x: number; y: number; src: string }> = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.height) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      const wrapped = ((tx % n) + n) % n;
      tiles.push({
        key: `${view.zoom}/${tx}/${ty}`,
        x: tx * TILE - left,
        y: ty * TILE - top,
        src: tileUrl(view.zoom, wrapped, ty),
      });
    }
  }

  const zoomBy = (delta: number, around?: { x: number; y: number }) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom + delta));
    if (zoom === view.zoom) return;
    if (!around) return setView({ ...view, zoom });
    // Keep the point under the cursor where it is.
    const before = unproject(left + around.x, top + around.y, view.zoom);
    const p = project(before.lat, before.lng, zoom);
    const c = unproject(p.x - around.x + size.width / 2, p.y - around.y + size.height / 2, zoom);
    setView({ lat: c.lat, lng: c.lng, zoom });
  };

  const selected = points.find((p) => p.id === selectedId) ?? null;
  const selectedPos = selected ? project(selected.latitude, selected.longitude, view.zoom) : null;

  return (
    <div
      ref={box}
      className="relative h-full min-h-[320px] w-full touch-none overflow-hidden bg-[oklch(95.5%_0.01_80)] bg-[repeating-linear-gradient(0deg,transparent_0_62px,oklch(91%_0.01_70)_62px_64px),repeating-linear-gradient(90deg,transparent_0_78px,oklch(91%_0.01_70)_78px_80px)] select-none"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-map-control]")) return;
        drag.current = { x: e.clientX, y: e.clientY, cx: center.x, cy: center.y, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        const c = unproject(d.cx - dx, d.cy - dy, view.zoom);
        setView({ lat: c.lat, lng: c.lng, zoom: view.zoom });
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved && !(e.target as HTMLElement).closest("[data-map-pin],[data-map-popup]"))
          onSelect(null);
      }}
      onWheel={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        zoomBy(e.deltaY < 0 ? 1 : -1, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      {tiles.map((t) => (
        <img
          key={t.key}
          src={t.src}
          alt=""
          draggable={false}
          // A tile that can't load (offline, blocked) leaves the plain
          // background rather than a broken-image icon.
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
          className="pointer-events-none absolute max-w-none"
          style={{ left: t.x, top: t.y, width: TILE, height: TILE }}
        />
      ))}

      {points.map((p) => {
        const pos = project(p.latitude, p.longitude, view.zoom);
        const x = pos.x - left;
        const y = pos.y - top;
        if (x < -40 || y < -40 || x > size.width + 40 || y > size.height + 40) return null;
        return (
          <button
            key={p.id}
            type="button"
            data-map-pin
            onClick={() => onSelect(p.id === selectedId ? null : p.id)}
            className="absolute flex items-center gap-1.5"
            style={{
              left: x,
              top: y,
              transform: "translate(-7px, -7px)",
              zIndex: p.id === selectedId ? 3 : 1,
            }}
            aria-label={p.name}
          >
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 border-bo-surface shadow-[0_1px_4px_rgba(20,15,5,0.3)] ${p.id === selectedId ? "ring-2 ring-bo-dark" : ""}`}
              style={{ background: p.color }}
            />
            {((p.labelled && view.zoom >= LABEL_ZOOM) || p.id === selectedId) && (
              <span className="rounded-md bg-bo-surface/90 px-1.5 py-0.5 font-sans text-[12px] font-semibold whitespace-nowrap text-bo-ink-soft">
                {p.name}
              </span>
            )}
          </button>
        );
      })}

      {selected && selectedPos && popup && (
        <div
          data-map-popup
          className="absolute z-10 w-[230px]"
          style={{
            left: Math.min(Math.max(8, selectedPos.x - left + 14), size.width - 238),
            top: Math.min(Math.max(8, selectedPos.y - top - 20), size.height - 150),
          }}
        >
          {popup}
        </div>
      )}

      <div
        data-map-control
        className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-lg border border-bo-border bg-bo-surface shadow-sm"
      >
        <button
          type="button"
          onClick={() => zoomBy(1)}
          className="h-8 w-8 font-sans text-base text-bo-ink-soft"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-1)}
          className="h-8 w-8 border-t border-bo-border font-sans text-base text-bo-ink-soft"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
      <span
        data-map-control
        className="absolute right-1 bottom-1 rounded bg-bo-surface/85 px-1.5 py-0.5 font-sans text-[11px] text-bo-muted-4"
      >
        {env.VITE_MAPBOX_ACCESS_TOKEN ? "© Mapbox © OpenStreetMap" : "© OpenStreetMap contributors"}
      </span>
    </div>
  );
}
