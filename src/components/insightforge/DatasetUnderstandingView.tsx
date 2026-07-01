import type { DatasetUnderstanding } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Database, Tag, KeyRound, Calendar, Hash, Type } from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  ecommerce: "E-commerce", retail: "Retail", finance: "Finance",
  banking: "Banking", healthcare: "Healthcare", education: "Education",
  manufacturing: "Manufacturing", logistics: "Logistics", hr: "HR",
  marketing: "Marketing", saas: "SaaS", operations: "Operations", generic: "General",
};

const ROLE_ICON = { measure: Hash, dimension: Tag, key: KeyRound, date: Calendar, metadata: Type };

export function DatasetUnderstandingView({ data }: { data: DatasetUnderstanding }) {
  return (
    <div className="space-y-6">
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <Database className="h-3.5 w-3.5" /> Domain
            </div>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="font-display text-2xl font-semibold">
                {DOMAIN_LABELS[data.domain] ?? data.domain}
              </h2>
              <ConfidenceBadge value={data.domainConfidence} />
            </div>
          </div>
          {data.primaryEntities.length > 0 && (
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Primary Entities</div>
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                {data.primaryEntities.map((e) => (
                  <span key={e} className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">{data.summary}</p>
        {data.purpose && (
          <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Purpose</div>
            <p className="mt-1 text-sm text-foreground/80">{data.purpose}</p>
          </div>
        )}
        {data.warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-warning">Warnings</div>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-foreground/80">
              {data.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      {data.suggestedKPIs.length > 0 && (
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold">Suggested KPIs</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.suggestedKPIs.map((k, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="text-sm font-semibold gradient-text">{k.name}</div>
                <p className="mt-1 text-xs text-foreground/80">{k.rationale}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {k.columns.map((c) => (
                    <code key={c} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px]">{c}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border/60 p-5">
          <h3 className="text-sm font-semibold">Column Semantics</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">AI-inferred business meaning for each column.</p>
        </div>
        <div className="scrollbar-thin max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-card/95 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-5 py-2.5">Column</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Nulls</th>
                <th className="px-5 py-2.5">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {data.columnProfiles.map((p) => {
                const RoleIcon = ROLE_ICON[p.inferredRole];
                return (
                  <tr key={p.name} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-5 py-2.5 font-mono text-xs">{p.name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.inferredType.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        <RoleIcon className="h-2.5 w-2.5" /> {p.inferredRole}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{p.nullCount.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-xs text-foreground/80">{p.businessMeaning ?? "—"}</td>
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