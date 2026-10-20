import { beforeEach, describe, expect, it, vi } from "vitest";

// Same stub as shops-api.test.ts: `path` is declared so the call tuple is typed.
const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(async (_path: string, _options?: unknown) => ({})),
}));
vi.mock("./api-client", () => ({ apiRequest }));

import { billingApi } from "./billing-api";

function lastPath(): string {
  const call = apiRequest.mock.calls.at(-1);
  if (!call) throw new Error("apiRequest was never called");
  return call[0];
}

describe("billingApi.listAdminCatalogRows query building", () => {
  beforeEach(() => {
    apiRequest.mockClear();
  });

  it("always sends the page and page size, and nothing else when unfiltered", async () => {
    await billingApi.listAdminCatalogRows({ page: 1, pageSize: 20 });
    expect(lastPath()).toBe("/billing/products/admin/rows?page=1&pageSize=20");
  });

  it("passes each filter through", async () => {
    await billingApi.listAdminCatalogRows({
      page: 3,
      pageSize: 50,
      productId: "prod-1",
      interval: "half_year",
      status: "no_prices",
    });
    expect(lastPath()).toBe(
      "/billing/products/admin/rows?page=3&pageSize=50&productId=prod-1&interval=half_year&status=no_prices",
    );
  });

  it("leaves out an empty product filter rather than sending productId=", async () => {
    // productId= would be a 400; "" is the page's "All Products".
    await billingApi.listAdminCatalogRows({ page: 1, pageSize: 10, productId: "" });
    expect(lastPath()).toBe("/billing/products/admin/rows?page=1&pageSize=10");
  });
});
