import type { AnalyticsService } from "./types";
import { tsAnalyticsService } from "./tsimplementation";
import { createHttpAnalyticsService } from "./httpImplementation";

/**
 * Provider selection — backend-agnostic.
 *
 * Set `VITE_INSIGHTFORGE_API_URL` to point the frontend at a deployed
 * FastAPI backend (must implement the contracts in `./types.ts`).
 * Without it, the local TypeScript implementation is used.
 */
const apiUrl = (
  import.meta.env.VITE_INSIGHTFORGE_API_URL as string | undefined
)?.trim();

export const analyticsService: AnalyticsService = apiUrl
  ? createHttpAnalyticsService(apiUrl)
  : tsAnalyticsService;

export * from "./types";
