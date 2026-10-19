import { useEffect, useId, useMemo, useRef, useState } from "react";
import { salesApi, type PlaceSuggestion } from "@/lib/sales-api";
import { inputClass, labelClass, linkButtonClass } from "./SalesUi";

export interface AddressValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/** "1821 E 6th St, Austin, TX 78702" → "78702" — the same rule the API routes leads by. */
export function postalCodeOf(address: string): string | null {
  const matches = [...address.matchAll(/\b(\d{4,6})(?:-\d{4})?\b/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1]!;
  if (
    matches.length === 1 &&
    last.index !== undefined &&
    last.index < 3 &&
    last.index === address.search(/\d/)
  ) {
    return null;
  }
  return last[1] ?? null;
}

function newSessionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The address box on the New lead form: type and pick from suggestions
 * (which pins the lead on the map, and is what the 50 m duplicate check
 * needs), or "Use my location" when the rep is standing in the shop.
 *
 * Typing without picking a suggestion is fine — the lead just has no pin
 * yet, and routing still works from the postal code in the text.
 */
export function AddressField({
  value,
  onChange,
  near,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  near?: { latitude: number; longitude: number } | null;
}) {
  const id = useId();
  const session = useMemo(newSessionToken, []);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current || value.address.trim().length < 3 || value.latitude !== null) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      salesApi
        .geocode(value.address.trim(), session, near ?? undefined)
        .then((r) => {
          if (!cancelled) {
            setSuggestions(r.suggestions.slice(0, 6));
            setOpen(true);
          }
        })
        .catch(() => {
          // Address search is a convenience — when it's unavailable the
          // rep can still type the address in full.
          if (!cancelled) setSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value.address, value.latitude, session, near]);

  async function pick(s: PlaceSuggestion) {
    setOpen(false);
    setSuggestions([]);
    typed.current = false;
    try {
      const { place } = await salesApi.geocodeRetrieve(s.id, session);
      onChange({
        address: place.displayName || s.displayName,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      setNote(null);
    } catch {
      onChange({ address: s.displayName, latitude: null, longitude: null });
      setNote("Couldn't pin that address on the map — it's saved as text.");
    }
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setNote("This browser can't share your location.");
      return;
    }
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = value.address;
        try {
          const r = await salesApi.reverseGeocode(latitude, longitude);
          if (r.displayName) address = r.displayName;
        } catch {
          // Keep whatever was typed; the pin is the important part.
        }
        typed.current = false;
        onChange({ address: address || "Current location", latitude, longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setNote("Location permission was refused — type the address instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClass}>
          Address
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          className={linkButtonClass}
          disabled={locating}
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      <div className="relative">
        {value.latitude !== null && (
          <span
            className="absolute top-1/2 left-3 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[oklch(55%_0.13_145)]"
            title="Pinned on the map"
            aria-hidden
          />
        )}
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={value.address}
          placeholder="Start typing the street address"
          onChange={(e) => {
            typed.current = true;
            onChange({ address: e.target.value, latitude: null, longitude: null });
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`${inputClass} ${value.latitude !== null ? "pl-8" : ""}`}
          aria-autocomplete="list"
          aria-describedby={open && suggestions.length > 0 ? `${id}-list` : undefined}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-list`}
          aria-label="Address suggestions"
          className="absolute top-full right-0 left-0 z-10 m-0 mt-1 list-none overflow-hidden rounded-[10px] border border-bo-border bg-bo-surface p-0 shadow-[0_12px_30px_-10px_rgba(20,15,5,0.35)]"
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left font-sans text-[14px] text-bo-ink-soft hover:bg-bo-well"
              >
                {s.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && <span className="font-sans text-[12px] text-bo-muted-4">{note}</span>}
    </div>
  );
}
