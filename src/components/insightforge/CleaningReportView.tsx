import type { CleaningReport } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { AlertTriangle, Info, OctagonAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SEV_CONFIG = {
  info: {
    Icon: Info,
    label: "Info",
    card: "border-info/25",
    icon: "bg-info/10 text-info",
  },
  warning: {
    Icon: AlertTriangle,
    label: "Warning",
    card: "border-warning/25",
    icon: "bg-warning/10 text-warning",
  },
  critical: {
    Icon: OctagonAlert,
    label: "Critical",
    card: "border-destructive/25",
    icon: "bg-destructive/10 text-destructive",
  },
} as const;

export function CleaningReportView({ report }: { report: CleaningReport }) {
  const scoreColor =
    report.qualityScore >= 80
      ? "text-success"
      : report.qualityScore >= 60
      ? "text-warning"
      : "text-destructive";

  const barColor =
    report.qualityScore >= 80
      ? "bg-success"
      : report.qualityScore >= 60
      ? "bg-warning"
      : "bg-destructive";

  return (
    <div className="space-y-4">
      {/* ── Quality score card ─────────────────────────── */}
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-start gap-6 sm:flex-nowrap">
          {/* Score */}
          <div className="shrink-0">
            <div className="field-label mb-1.5">Data Quality Score</div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("font-display text-4xl font-semibold tabular-nums", scoreColor)}>
                {report.qualityScore}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Progress + stats */}
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Quality</span>
              <span className="tabular-nums">{report.qualityScore}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn("h-full rounded-full transition-all duration-700", barColor)}
                style={{ width: `${report.qualityScore}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                <span className="tabular-nums font-medium text-foreground">
                  {report.rowsBefore.toLocaleString()}
                </span>{" "}
                rows in
              </span>
              <span>→</span>
              <span>
                <span className="tabular-nums font-medium text-foreground">
                  {report.rowsAfter.toLocaleString()}
                </span>{" "}
                rows out
              </span>
              {report.rowsBefore !== report.rowsAfter && (
                <span className="text-destructive/80">
                  −{(report.rowsBefore - report.rowsAfter).toLocaleString()} removed
                </span>
              )}
            </div>

            {report.notes && (
              <p className="mt-3 text-xs text-muted-foreground">{report.notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Issues list ────────────────────────────────── */}
      <div className="space-y-3">
        {report.issues.length === 0 ? (
          <div className="card-elevated empty-state">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No issues detected</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dataset looks healthy — no cleaning was required.
              </p>
            </div>
          </div>
        ) : (
          report.issues.map((issue) => {
            const cfg = SEV_CONFIG[issue.severity];
            return (
              <div
                key={issue.id}
                className={cn(
                  "card-elevated overflow-hidden border",
                  cfg.card,
                )}
              >
                <div className="flex items-start gap-4 p-4 sm:p-5">
                  {/* Severity icon */}
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      cfg.icon,
                    )}
                  >
                    <cfg.Icon className="h-4.5 w-4.5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">{issue.title}</h4>
                      <span className="rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {issue.action.replace(/_/g, " ")}
                      </span>
                      <ConfidenceBadge value={issue.confidence} />
                      {issue.requiresApproval && (
                        <span className="rounded-md bg-warning/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                          Needs approval
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-foreground/80">
                      {issue.description}
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <IssueField label="Reasoning">{issue.reasoning}</IssueField>
                      <IssueField label="Business impact">{issue.businessImpact}</IssueField>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const IssueField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
    <div className="field-label mb-1">{label}</div>
    <div className="text-xs text-foreground/80">{children}</div>
  </div>
);