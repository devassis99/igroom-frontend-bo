import type { ImportRow } from "./sales-api";

/**
 * Just enough CSV for "Import leads": RFC 4180 quoting (commas, quotes and
 * newlines inside quoted cells), CRLF or LF, a UTF-8 BOM, and a semicolon
 * delimiter when that's what the file plainly uses (Excel in much of
 * Europe saves CSV that way). Parsed in the browser so the server only
 * ever sees mapped, clean rows.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.slice(
    0,
    input.search(/\r?\n/) === -1 ? undefined : input.search(/\r?\n/),
  );
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Blank lines (a trailing newline, a spacer row) aren't rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const LEAD_FIELDS = [
  { key: "shopName", label: "Shop name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "postalCode", label: "Postal code" },
  { key: "ownerName", label: "Owner name" },
  { key: "email", label: "Email" },
  { key: "chairs", label: "Chairs" },
  { key: "currentTool", label: "Current booking tool" },
  { key: "notes", label: "Notes" },
  { key: "skip", label: "Skip column" },
] as const;

export type LeadField = (typeof LEAD_FIELDS)[number]["key"];

const GUESSES: Array<[LeadField, RegExp]> = [
  ["shopName", /^(business|shop|salon|store|company)?\s*(name|title)$|^business$|^shop$|^salon$/i],
  ["phone", /phone|tel|mobile|cell|contact number/i],
  ["postalCode", /zip|postal|post code|postcode/i],
  ["address", /address|street|location/i],
  ["ownerName", /owner|contact|manager|person/i],
  ["email", /e-?mail/i],
  ["chairs", /chairs?|stations?|seats?/i],
  ["currentTool", /booking|software|tool|system/i],
  ["notes", /notes?|comments?|rating|reviews?|description/i],
];

/**
 * A first guess at what each column is, from its header — the step 2
 * screen shows it and the person corrects it. Each field is used at most
 * once; anything unrecognised is skipped rather than guessed into notes.
 */
export function guessMapping(headers: string[]): LeadField[] {
  const used = new Set<LeadField>();
  return headers.map((header) => {
    const h = header.trim();
    for (const [field, pattern] of GUESSES) {
      if (!used.has(field) && pattern.test(h)) {
        used.add(field);
        return field;
      }
    }
    return "skip";
  });
}

/**
 * The mapped rows the server is sent. More than one column mapped to
 * Notes is joined, labelled with its header ("Rating: 4.7 (212 reviews)"),
 * because that's where a scraped list's extra columns are worth keeping.
 */
export function toImportRows(
  headers: string[],
  body: string[][],
  mapping: LeadField[],
): ImportRow[] {
  return body.map((cells) => {
    const row: ImportRow = {};
    const notes: string[] = [];
    mapping.forEach((field, i) => {
      const value = (cells[i] ?? "").trim();
      if (!value || field === "skip") return;
      if (field === "notes") {
        notes.push(
          mapping.filter((f) => f === "notes").length > 1 ? `${headers[i]}: ${value}` : value,
        );
      } else if (field === "chairs") {
        const n = Number.parseInt(value, 10);
        if (Number.isFinite(n) && n >= 0 && n <= 200) row.chairs = n;
      } else {
        row[field] = value.slice(0, field === "address" ? 1000 : 255);
      }
    });
    if (notes.length) row.notes = notes.join(" · ");
    return row;
  });
}
