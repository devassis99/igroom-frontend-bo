import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, request } from "./http";

describe("request", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    const result = await request<{ ok: boolean }>("/health");
    expect(result).toEqual({ ok: true });
  });

  it("throws ApiError with the response status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ message: "Missing bearer token" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(request("/auth/me")).rejects.toMatchObject(
      new ApiError(401, "Missing bearer token"),
    );
  });

  it("returns undefined for 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await expect(request("/auth/logout")).resolves.toBeUndefined();
  });
});
