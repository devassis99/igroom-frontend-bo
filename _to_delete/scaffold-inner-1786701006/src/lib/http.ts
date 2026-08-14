import { env } from "./env";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip JSON-encoding `body` (e.g. FormData). Off by default. */
  raw?: boolean;
}

/**
 * Bare fetch wrapper: base URL + JSON in/out + typed errors. Deliberately
 * has zero knowledge of auth tokens — src/lib/api-client.ts layers that on
 * top. Kept separate so auth/auth-api.ts (which issues the *first* Google
 * login and MFA calls, before any access token exists) can use this
 * directly without pulling in the token-refresh machinery that depends on
 * auth-api in the first place.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, raw, headers, ...rest } = options;

  const response = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(raw ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? (body as BodyInit) : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : undefined) ?? `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}
