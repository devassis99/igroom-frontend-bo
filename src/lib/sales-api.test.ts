import { describe, expect, it } from "vitest";
import { ApiError } from "./http";
import {
  chairsLabel,
  directionsHref,
  dueLabel,
  duplicatesFrom,
  formatMoney,
  nextWeek,
  relativeAgo,
  telHref,
} from "./sales-api";

// Local times throughout, so the tests read the same in any time zone.
const now = new Date(2026, 9, 14, 11, 0); // Wed Oct 14, 11:00
const local = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m).toISOString();

describe("dueLabel", () => {
  it("shows the time for today, and flags it once it's more than an hour late", () => {
    expect(dueLabel(local(14, 15), now)).toEqual({ text: "3:00 PM", tone: "today" });
    expect(dueLabel(local(14, 15), now, { long: true }).text).toBe("Today 3:00 PM");
    expect(dueLabel(local(14, 9), now).tone).toBe("overdue");
  });

  it("treats midnight as no particular time", () => {
    expect(dueLabel(local(14), now)).toEqual({ text: "Today", tone: "today" });
  });

  it("reads earlier days as overdue and later ones as soon", () => {
    expect(dueLabel(local(12, 10), now)).toEqual({ text: "Oct 12", tone: "overdue" });
    expect(dueLabel(local(15, 10), now)).toEqual({ text: "Tomorrow", tone: "soon" });
    expect(dueLabel(local(20, 10), now)).toEqual({ text: "Oct 20", tone: "soon" });
    expect(dueLabel(null, now)).toEqual({ text: "—", tone: "none" });
  });
});

describe("relativeAgo", () => {
  it("steps from minutes to weeks", () => {
    expect(relativeAgo(new Date(now.getTime() - 30_000).toISOString(), now)).toBe("just now");
    expect(relativeAgo(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe("5m ago");
    expect(relativeAgo(new Date(now.getTime() - 3 * 3_600_000).toISOString(), now)).toBe("3h ago");
    expect(relativeAgo(local(13, 10), now)).toBe("yesterday");
    expect(relativeAgo(local(9, 10), now)).toBe("5d ago");
    expect(relativeAgo(new Date(2026, 8, 20, 10).toISOString(), now)).toBe("3w ago");
  });
});

describe("small formatters", () => {
  it("formats money without needless cents", () => {
    expect(formatMoney(4000)).toBe("$40");
    expect(formatMoney(12990)).toBe("$129.90");
  });

  it("pluralises chairs", () => {
    expect(chairsLabel(1)).toBe("1 chair");
    expect(chairsLabel(4)).toBe("4 chairs");
    expect(chairsLabel(null)).toBeNull();
  });

  it("builds tel: and directions links", () => {
    expect(telHref("(512) 555-0901")).toBe("tel:5125550901");
    expect(telHref("+1 512 555 0901")).toBe("tel:+15125550901");
    expect(directionsHref({ address: "1 Main St", latitude: 30.1, longitude: -97.7 })).toContain(
      "destination=30.1,-97.7",
    );
    expect(directionsHref({ address: "1 Main St", latitude: null, longitude: null })).toContain(
      "destination=1%20Main%20St",
    );
    expect(directionsHref({ address: null, latitude: null, longitude: null })).toBeNull();
  });

  it("puts next week on Monday at 10:00", () => {
    const at = new Date(nextWeek(now));
    expect([at.getDay(), at.getDate(), at.getHours()]).toEqual([1, 19, 10]);
  });
});

describe("duplicatesFrom", () => {
  it("only reads the duplicate list off a 409 DUPLICATE", () => {
    const duplicates = [{ id: "l1" }];
    expect(duplicatesFrom(new ApiError(409, "dup", { code: "DUPLICATE", duplicates }))).toEqual(
      duplicates,
    );
    expect(duplicatesFrom(new ApiError(409, "other", { code: "CONFLICT" }))).toBeNull();
    expect(duplicatesFrom(new Error("boom"))).toBeNull();
  });
});
