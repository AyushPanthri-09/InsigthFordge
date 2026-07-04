import type { AnalyticsService } from "./types";
import { tsAnalyticsService } from "./tsimplementation";
import { createHttpAnalyticsService } from "./httpImplementation";

/**
 * Provider selection — backend-agnostic.
 *
 * Set `VITE_INSIGHTFORGE_API_URL` to point the frontend at a deployed
 * FastAPI backend (must implement the contracts in `./types.ts`).
 * Without it, local dev uses the TypeScript implementation, while production
 * uses same-origin API routes provided by the Railway reverse proxy.
 */
const configuredApiUrl = (import.meta.env.VITE_INSIGHTFORGE_API_URL as string | undefined)?.trim();

export const analyticsService: AnalyticsService =
  configuredApiUrl || !import.meta.env.DEV
    ? createHttpAnalyticsService(configuredApiUrl ?? "")
    : tsAnalyticsService;

export * from "./types";
