import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { LEAD_FIELDS, guessMapping, parseCsv, toImportRows, type LeadField } from "@/lib/csv";
import { salesApi, type ImportSummary } from "@/lib/sales-api";
import {
  ErrorNote,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  useSalesMe,
} from "./SalesUi";

type Step = 1 | 2 | 3 | 4;
type Assign = "territory" | "rep" | "pool";

const MAX_ROWS = 2000;

function StepDot({
  n,
  label,
  current,
  done,
}: {
  n: number;
  label: string;
  current: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`font-sans text-xs ${current ? "font-semibold text-bo-ink" : done ? "font-medium text-bo-muted-2" : "font-medium text-bo-muted-6"}`}
    >
      {n} {label}
    </span>
  );
}

/**
 * B9h — Import leads from CSV, in three steps: upload, map columns, review
 * & import. The file is parsed here; the server sees mapped rows and
 * decides each one's fate twice (preview, then again on import, since the
 * pipeline can change between the two clicks).
 */
export function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useSalesMe();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [body, setBody] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<LeadField[]>([]);
  const [cityId, setCityId] = useState("");
  const [assign, setAssign] = useState<Assign>("territory");
  const [repId, setRepId] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [previewError, setPreviewError] = useState<unknown>(null);

  const cities = me.data?.cities ?? [];
  const city = cityId || me.data?.me.rep?.homeCityId || cities[0]?.id || "";
  const rows = useMemo(() => toImportRows(headers, body, mapping), [headers, body, mapping]);
  const hasName = mapping.includes("shopName");

  function reset() {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setBody([]);
    setMapping([]);
    setAssign("territory");
    setRepId("");
    setParseError(null);
    setSummary(null);
    setPreviewError(null);
    commit.reset();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParseError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setParseError("That file has no rows under its header.");
      return;
    }
    if (parsed.length - 1 > MAX_ROWS) {
      setParseError(`That's ${parsed.length - 1} rows — import up to ${MAX_ROWS} at a time.`);
      return;
    }
    const [head, ...rest] = parsed;
    setFileName(file.name);
    setHeaders(head!.map((h) => h.trim()));
    setBody(rest);
    setMapping(guessMapping(head!));
    setStep(2);
  }

  // The summary cards follow the mapping as it's corrected.
  useEffect(() => {
    if (step < 2 || !hasName || rows.length === 0) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      salesApi
        .previewImport({ rows, cityId: city || null })
        .then((r) => {
          if (!cancelled) {
            setSummary(r.summary);
            setPreviewError(null);
          }
        })
        .catch((err) => !cancelled && setPreviewError(err));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, rows, city, hasName]);

  const commit = useMutation({
    mutationFn: () =>
      salesApi.commitImport({
        rows,
        cityId: city || null,
        assign,
        repId: assign === "rep" ? repId : null,
        fileName,
      }),
    onSuccess: () => {
      setStep(4);
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} width={780} label="Import leads">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">Import leads</h2>
          <p className="m-0 font-sans text-xs text-bo-muted-4">
            Match your columns to lead fields. We check every row for duplicates before importing.
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

      <div className="flex flex-wrap items-center gap-2">
        <StepDot n={1} label="Upload" current={step === 1} done={step > 1} />
        <span className="h-px w-6 bg-bo-input-border" />
        <StepDot n={2} label="Map columns" current={step === 2} done={step > 2} />
        <span className="h-px w-6 bg-bo-input-border" />
        <StepDot n={3} label="Review & import" current={step >= 3} done={step > 3} />
        <div className="flex-1" />
        {fileName && (
          <span className="rounded-lg bg-[oklch(94%_0.012_70)] px-2.5 py-1 font-sans text-xs font-medium text-bo-ink-soft">
            {fileName} · {body.length} rows
          </span>
        )}
      </div>

      {step === 1 && (
        <>
          {/* Dropping a file is a shortcut for the file input inside, which
              stays the accessible way in — hence the handlers on a label. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-[oklch(78%_0.02_60)] bg-bo-well px-4 py-10 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="font-sans text-sm font-semibold text-bo-ink-soft">
              Drop a CSV here, or choose a file
            </span>
            <span className="font-sans text-xs text-bo-muted-4">
              A row per shop, with a header row. Shop name is the only column you must have.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className={labelClass}>City</span>
            <select value={city} onChange={(e) => setCityId(e.target.value)} className={inputClass}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.region ? `, ${c.region}` : ""}
                </option>
              ))}
            </select>
          </label>
          {parseError && <p className="m-0 font-sans text-xs text-bo-red">{parseError}</p>}
        </>
      )}

      {step >= 2 && step <= 3 && (
        <>
          {step === 2 && (
            <div className="overflow-hidden rounded-xl border border-bo-border">
              <div className="grid grid-cols-[1fr_1.3fr_24px_1fr] gap-3 bg-bo-table-head px-4 py-2 font-sans text-[12px] font-semibold text-bo-muted-4">
                <span>Your column</span>
                <span>First row</span>
                <span />
                <span>Lead field</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                {headers.map((h, i) => (
                  <div
                    key={`${h}-${i}`}
                    className="grid grid-cols-[1fr_1.3fr_24px_1fr] items-center gap-3 border-t border-bo-border-soft px-4 py-2"
                  >
                    <span className="truncate font-sans text-xs font-semibold text-bo-ink-soft">
                      {h || `Column ${i + 1}`}
                    </span>
                    <span className="truncate font-sans text-xs text-bo-muted-3">
                      {body[0]?.[i] ?? ""}
                    </span>
                    <span className="font-sans text-xs text-bo-faint">→</span>
                    <select
                      value={mapping[i]}
                      onChange={(e) => {
                        const next = [...mapping];
                        const field = e.target.value as LeadField;
                        // One column per field (except Notes and Skip) — picking a
                        // field that's taken frees the other column.
                        if (field !== "notes" && field !== "skip") {
                          next.forEach((f, j) => {
                            if (f === field && j !== i) next[j] = "skip";
                          });
                        }
                        next[i] = field;
                        setMapping(next);
                      }}
                      aria-label={`Field for ${h}`}
                      className={`rounded-lg border border-bo-input-border bg-bo-field px-2.5 py-1.5 font-sans text-xs font-medium ${mapping[i] === "skip" ? "text-bo-muted-5" : "text-bo-ink-soft"}`}
                    >
                      {LEAD_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasName && (
            <p className="m-0 font-sans text-xs font-semibold text-bo-red">
              Pick which column is the shop name.
            </p>
          )}

          {summary && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-bo-border px-3.5 py-3">
                <p className="m-0 font-sans text-xl font-bold text-bo-success">
                  {summary.newLeads}
                </p>
                <p className="m-0 mt-0.5 font-sans text-xs text-bo-muted-2">New leads</p>
              </div>
              <div className="rounded-xl border border-bo-border px-3.5 py-3">
                <p className="m-0 font-sans text-xl font-bold text-bo-gold">{summary.duplicates}</p>
                <p className="m-0 mt-0.5 font-sans text-xs text-bo-muted-2">
                  Already in pipeline or live · skipped
                </p>
              </div>
              <div className="rounded-xl border border-bo-border px-3.5 py-3">
                <p className="m-0 font-sans text-xl font-bold text-bo-red">{summary.noPhone}</p>
                <p className="m-0 mt-0.5 font-sans text-xs text-bo-muted-2">
                  No phone · imported and flagged
                  {summary.invalid ? ` · ${summary.invalid} unusable rows skipped` : ""}
                </p>
              </div>
            </div>
          )}
          <ErrorNote error={previewError} fallback="Couldn't check the rows." />

          <div className="flex flex-col gap-2">
            <span className={labelClass}>Assign new leads</span>
            <div className="flex flex-wrap gap-x-4.5 gap-y-2" role="radiogroup">
              {(
                [
                  ["territory", "By territory (postal code)"],
                  ["rep", "All to one rep"],
                  ["pool", "Leave in unassigned pool"],
                ] as Array<[Assign, string]>
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 font-sans text-[14px] font-medium text-bo-ink-soft"
                >
                  <input
                    type="radio"
                    name="assign"
                    checked={assign === value}
                    onChange={() => setAssign(value)}
                    className="h-4 w-4 accent-[oklch(30%_0.02_50)]"
                  />
                  {label}
                </label>
              ))}
              {assign === "rep" && (
                <select
                  value={repId}
                  onChange={(e) => setRepId(e.target.value)}
                  className="rounded-lg border border-bo-input-border bg-bo-field px-2 py-1 font-sans text-xs"
                  aria-label="Rep"
                >
                  <option value="">Pick a rep…</option>
                  {(me.data?.reps ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="m-0 font-sans text-xs text-bo-muted-4">
              Imported as New with source “CSV import”.
              {assign === "territory" && summary
                ? ` ${summary.outsideTerritories} row${summary.outsideTerritories === 1 ? "" : "s"} fall${summary.outsideTerritories === 1 ? "s" : ""} outside every territory and go${summary.outsideTerritories === 1 ? "es" : ""} to the pool.`
                : ""}
            </p>
          </div>

          {step === 3 && summary && (
            <p className="m-0 rounded-[10px] bg-bo-well px-3 py-2.5 font-sans text-[14px] text-bo-ink-soft">
              Ready to import <b>{summary.toImport}</b> lead{summary.toImport === 1 ? "" : "s"} into{" "}
              {cities.find((c) => c.id === city)?.name ?? "the pipeline"}.
            </p>
          )}
          <ErrorNote error={commit.error} fallback="The import failed." />

          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => (step === 3 ? setStep(2) : reset())}
              className={secondaryButtonClass}
            >
              Back
            </button>
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={
                  !summary || !hasName || summary.toImport === 0 || (assign === "rep" && !repId)
                }
                className={primaryButtonClass}
              >
                Review {summary?.toImport ?? 0} leads
              </button>
            ) : (
              <button
                type="button"
                onClick={() => commit.mutate()}
                disabled={commit.isPending}
                className={primaryButtonClass}
              >
                {commit.isPending ? "Importing…" : `Import ${summary?.toImport ?? 0} leads`}
              </button>
            )}
          </div>
        </>
      )}

      {step === 4 && commit.data && (
        <>
          <div className="rounded-xl bg-bo-well px-4 py-3.5 font-sans text-sm text-bo-ink-soft">
            <p className="m-0 mb-1 font-semibold">
              Imported {commit.data.imported} lead{commit.data.imported === 1 ? "" : "s"}.
            </p>
            <p className="m-0 text-[14px] text-bo-muted-2">
              {[
                commit.data.byRep.map((r) => `${r.count} to ${r.name}`).join(", "),
                commit.data.toPool ? `${commit.data.toPool} to the pool` : null,
                commit.data.flaggedNoPhone
                  ? `${commit.data.flaggedNoPhone} flagged for no phone`
                  : null,
                commit.data.skippedDuplicates
                  ? `${commit.data.skippedDuplicates} skipped as already known`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
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
