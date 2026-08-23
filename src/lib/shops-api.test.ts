import { describe, expect, it, vi, beforeEach } from "vitest";

// The `path` param has to be declared even though the stub ignores it —
// without it the mock's call tuple is typed `[]` and lastPath() below
// can't index into it.
const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(async (_path: string, _options?: unknown) => ({})),
}));
vi.mock("./api-client", () => ({ apiRequest }));

import { formatCents, shopsApi } from "./shops-api";

/** The path the last shopsApi call passed to apiRequest. */
function lastPath(): string {
  const call = apiRequest.mock.calls.at(-1);
  if (!call) throw new Error("apiRequest was never called");
  return call[0];
}

describe("shopsApi.list query building", () => {
  beforeEach(() => {
    apiRequest.mockClear();
  });

  it("sends no query string at all when nothing is filtered", async () => {
    await shopsApi.list();
    expect(lastPath()).toBe("/shops");
  });

  it("omits an empty search term rather than sending q=", async () => {
    // `?q=` is a filter matching nothing, not the absence of a filter.
    await shopsApi.list({ q: "   " });
    expect(lastPath()).toBe("/shops");
  });

  it("joins multiple statuses into one comma-separated param", async () => {
    await shopsApi.list({ statuses: ["trial", "past_due"] });
    expect(lastPath()).toBe("/shops?status=trial%2Cpast_due");
  });

  it("drops an empty status array instead of sending status=", async () => {
    await shopsApi.list({ statuses: [] });
    expect(lastPath()).toBe("/shops");
  });

  it("URL-encodes a search term with spaces and punctuation", async () => {
    await shopsApi.list({ q: "Solo Chair — Ray O." });
    expect(lastPath()).toContain("q=Solo+Chair+%E2%80%94+Ray+O.");
  });

  it("passes sort, direction and paging through", async () => {
    await shopsApi.list({ sort: "mrr", direction: "desc", page: 2, pageSize: 25 });
    const path = lastPath();
    expect(path).toContain("sort=mrr");
    expect(path).toContain("direction=desc");
    expect(path).toContain("page=2");
    expect(path).toContain("pageSize=25");
  });

  it("serialises the marketplace flag as a string, including false", async () => {
    // `false` is a real filter ("shops NOT listed"), so it must survive —
    // a falsy check here would silently drop it.
    await shopsApi.list({ isMarketplaceListed: false });
    expect(lastPath()).toBe("/shops?marketplace=false");
  });
});

describe("formatCents", () => {
  it("drops the decimals on a whole-dollar amount", () => {
    expect(formatCents(4800)).toBe("$48");
    expect(formatCents(25_000)).toBe("$250");
  });

  it("keeps cents when the amount isn't whole dollars", () => {
    expect(formatCents(2733)).toBe("$27.33");
  });

  it("groups thousands", () => {
    expect(formatCents(123_400)).toBe("$1,234");
  });

  it("formats zero rather than rendering an empty cell", () => {
    expect(formatCents(0)).toBe("$0");
  });
});
