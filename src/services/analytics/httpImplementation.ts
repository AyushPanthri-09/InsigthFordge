import type { AnalyticsService, FullAnalysis } from "./types";

/**
 * Future FastAPI backend implementation.
 *
 * Endpoints (to be implemented in Python):
 *   POST   /api/datasets               multipart file upload → ParsedDataset
 *   POST   /api/datasets/:id/understand → DatasetUnderstanding
 *   POST   /api/datasets/:id/cleaning   → CleaningReport
 *   POST   /api/datasets/:id/cleaning/apply { issueIds } → CleaningReport
 *   POST   /api/datasets/:id/eda        → EDAReport
 *   POST   /api/datasets/:id/analytics  → AnalyticsReport
 *
 * Base URL is set via `VITE_INSIGHTFORGE_API_URL`. When unset, the frontend
 * falls back to the in-process TypeScript implementation (see `index.ts`).
 */
export function createHttpAnalyticsService(baseUrl: string): AnalyticsService {
  const jsonFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const r = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!r.ok) throw new Error(`API ${path} failed: ${r.status} ${await r.text()}`);
    return r.json();
  };

  return {
    async parseFile(file) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${baseUrl}/api/datasets`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
      return r.json();
    },
    understandDataset: (id, notes) =>
      jsonFetch(`/api/datasets/${id}/understand`, { method: "POST", body: JSON.stringify({ notes }) }),
    proposeCleaning: (id, notes) =>
      jsonFetch(`/api/datasets/${id}/cleaning`, { method: "POST", body: JSON.stringify({ notes }) }),
    applyCleaning: (id, issueIds) =>
      jsonFetch(`/api/datasets/${id}/cleaning/apply`, { method: "POST", body: JSON.stringify({ issueIds }) }),
    runEDA: (id, notes) =>
      jsonFetch(`/api/datasets/${id}/eda`, { method: "POST", body: JSON.stringify({ notes }) }),
    runAnalytics: (id, notes) =>
      jsonFetch(`/api/datasets/${id}/analytics`, { method: "POST", body: JSON.stringify({ notes }) }),
    async analyzeAll(file, options): Promise<FullAnalysis> {
      // Default sequential orchestration; the Python backend may expose a single endpoint.
      const dataset = await this.parseFile(file);
      const understanding = await this.understandDataset(dataset.datasetId, options?.notes);
      const cleaning = await this.proposeCleaning(dataset.datasetId, options?.notes);
      const eda = await this.runEDA(dataset.datasetId, options?.notes);
      const analytics = await this.runAnalytics(dataset.datasetId, options?.notes);
      return { dataset, understanding, cleaning, eda, analytics, reasoningLog: [] };
    },
  };
}