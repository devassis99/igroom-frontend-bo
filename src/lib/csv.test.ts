import { describe, expect, it } from "vitest";
import { guessMapping, parseCsv, toImportRows } from "./csv";

describe("parseCsv", () => {
  it("reads quoted cells with commas, quotes and newlines", () => {
    const rows = parseCsv(
      'Name,Address,Notes\r\n"Fade Lab","1 Main St, Austin","Says ""call after 2""\nTwo chairs"\r\n',
    );
    expect(rows).toEqual([
      ["Name", "Address", "Notes"],
      ["Fade Lab", "1 Main St, Austin", 'Says "call after 2"\nTwo chairs'],
    ]);
  });

  it("strips a BOM, skips blank lines and keeps empty cells", () => {
    expect(parseCsv("﻿a,b,c\n\n1,,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("uses semicolons when the header plainly does", () => {
    expect(parseCsv("Shop;Phone;Zip\nCuts, Co.;555;78702")).toEqual([
      ["Shop", "Phone", "Zip"],
      ["Cuts, Co.", "555", "78702"],
    ]);
  });
});

describe("guessMapping", () => {
  it("maps common headers and skips the rest", () => {
    expect(
      guessMapping(["Business Name", "Phone", "Full Address", "Contact", "Rating", "Website"]),
    ).toEqual(["shopName", "phone", "address", "ownerName", "notes", "skip"]);
  });

  it("uses each field once", () => {
    expect(guessMapping(["Phone", "Mobile phone"])).toEqual(["phone", "skip"]);
  });
});

describe("toImportRows", () => {
  it("joins several notes columns with their headers and parses chairs", () => {
    const rows = toImportRows(
      ["Shop", "Chairs", "Rating", "Hours"],
      [["Crown Fades", "4 chairs", "4.7", "9-6"]],
      ["shopName", "chairs", "notes", "notes"],
    );
    expect(rows).toEqual([
      { shopName: "Crown Fades", chairs: 4, notes: "Rating: 4.7 · Hours: 9-6" },
    ]);
  });

  it("drops blank cells, skipped columns and nonsense chair counts", () => {
    const rows = toImportRows(
      ["Shop", "Chairs", "Website"],
      [["  Zilker Clippers ", "lots", "zilker.example"]],
      ["shopName", "chairs", "skip"],
    );
    expect(rows).toEqual([{ shopName: "Zilker Clippers" }]);
  });
});
