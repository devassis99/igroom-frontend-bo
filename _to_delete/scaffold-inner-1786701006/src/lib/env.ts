import { z } from "zod";

/**
 * Single source of truth for build-time env vars, mirroring the pattern
 * in igroom-backend/src/config/env.ts — fail loudly at startup with a
 * clear message instead of a confusing runtime error the first time
 * something tries to read an unset value.
 *
 * Vite only exposes `VITE_`-prefixed vars to client code (by design —
 * anything else in .env stays server-only), and inlines them at build
 * time via import.meta.env.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url({ message: "VITE_API_BASE_URL must be a valid URL" }),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1, "VITE_GOOGLE_CLIENT_ID is required for Google sign-in"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check your .env file against .env.example");
}

export const env = parsed.data;
