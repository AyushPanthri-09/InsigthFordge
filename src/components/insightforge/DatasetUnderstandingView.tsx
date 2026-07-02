import type { DatasetUnderstanding } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import {
  Database,
  Tag,
  KeyRound,
  Calendar,
  Hash,
  Type,
  AlertTriangle,
} from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  ecommerce: "E-commerce",
  retail: "Retail",
  finance: "Finance",
  banking: "Banking",
  healthcare: "Healthcare",
  education: "Education",
  manufacturing: "Manufacturing",
  logistics: "Logistics",
  hr: "HR",
  marketing: "Marketing",
  saas: "SaaS",
  operations: "Operations",
  generic: "General",
};

const ROLE_ICON = {
  measure: Hash,
  dimension: Tag,
  key: KeyRound,
  date: Calendar,
  metadata: Type,
};

const ROLE_COLOR: Record<string, string> = {
  measure: "bg-info/10 text-info border-info/20",
  dimension: "bg-accent/10 text-accent border-accent/20",
  key: "bg-primary/10 text-primary border-primary/20",
  date: "bg-warning/10 text-warning border-warning/20",
  metadata: "bg-muted/40 text-muted-foreground border-border/60",
};

export function DatasetUnderstandingView({
  data,
}: {
  data: DatasetUnderstanding;
}) {
  return (
    <div className="space-y-6">
      {/* ── Domain overview ─────────────────────────────── */}
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              <span className="section-label">Detected domain</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold">
                {DOMAIN_LABELS[data.domain] ?? data.domain}
              </h2>
              <ConfidenceBadge value={data.domainConfidence} />
            </div>
          </div>
          {data.primaryEntities.length > 0 && (
            <div>
              <div className="section-label mb-2">Primary entities</div>
              <div className="flex flex-wrap gap-1.5">
                {data.primaryEntities.map((e) => (
                  <span
                    key={e}
                    className="rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-sm leading-relaxed text-foreground/85">
          {data.summary}
        </p>

        {data.purpose && (
          <div className="mt-4 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
            <div className="field-label mb-1">Purpose</div>
            <p className="text-sm text-foreground/80">{data.purpose}</p>
          </div>
        )}

        {data.warnings.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <div className="field-label text-warning mb-1">Warnings</div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/80">
                {data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Suggested KPIs ──────────────────────────────── */}
      {data.suggestedKPIs.length > 0 && (
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold">Suggested KPIs</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Metrics the AI recommends tracking for this dataset.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.suggestedKPIs.map((k, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-background/40 p-3.5 transition-colors hover:bg-muted/20"
              >
                <div className="text-sm font-semibold gradient-text">
                  {k.name}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                  {k.rationale}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {k.columns.map((c) => (
                    <code
                      key={c}
                      className="rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {c}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Column semantics table ───────────────────────── */}
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="text-sm font-semibold">Column Semantics</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            AI-inferred business meaning for each column.
          </p>
        </div>
        <div className="scrollbar-thin max-h-[480px] overflow-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="sticky top-0 z-10 backdrop-blur-sm">
              <tr className="bg-card/95">
                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Column
                </th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Type
                </th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Role
                </th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Nulls
                </th>
                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Business meaning
                </th>
              </tr>
            </thead>
            <tbody>
              {data.columnProfiles.map((p, idx) => {
                const RoleIcon = ROLE_ICON[p.inferredRole] ?? Tag;
                const roleColor =
                  ROLE_COLOR[p.inferredRole] ?? ROLE_COLOR.metadata;
                return (
                  <tr
                    key={p.name}
                    className={`border-t border-border/50 transition-colors hover:bg-muted/20 ${
                      idx % 2 === 1 ? "bg-white/[0.015]" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <code className="rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">
                        {p.name}
                      </code>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {p.inferredType.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleColor}`}
                      >
                        <RoleIcon className="h-2.5 w-2.5" />
                        {p.inferredRole}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                      {p.nullCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-xs text-foreground/80">
                      {p.businessMeaning ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
