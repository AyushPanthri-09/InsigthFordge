import type { CleaningReport } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

const SEV = {
  info: { Icon: Info, cls: "text-info border-info/30 bg-info/5" },
  warning: { Icon: AlertTriangle, cls: "text-warning border-warning/30 bg-warning/5" },
  critical: { Icon: OctagonAlert, cls: "text-destructive border-destructive/30 bg-destructive/5" },
};

export function CleaningReportView({ report }: { report: CleaningReport }) {
  return (
    <div className="space-y-4">
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Quality Score</div>
            <div className="mt-1 font-display text-3xl font-semibold">{report.qualityScore}<span className="text-base text-muted-foreground">/100</span></div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{report.rowsBefore.toLocaleString()} rows in</div>
            <div>{report.rowsAfter.toLocaleString()} rows out</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all"
               style={{ width: `${report.qualityScore}%` }} />
        </div>
        {report.notes && <p className="mt-3 text-sm text-muted-foreground">{report.notes}</p>}
      </div>

      <div className="space-y-3">
        {report.issues.length === 0 && (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
            No cleaning issues detected. Dataset looks healthy.
          </div>
        )}
        {report.issues.map((issue) => {
          const { Icon, cls } = SEV[issue.severity];
          return (
            <div key={issue.id} className={`card-elevated overflow-hidden border ${cls.split(" ")[1]}`}>
              <div className="flex items-start gap-3 p-4">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">{issue.title}</h4>
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {issue.action.replace(/_/g, " ")}
                    </span>
                    <ConfidenceBadge value={issue.confidence} />
                    {issue.requiresApproval && (
                      <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                        Needs approval
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{issue.description}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Field label="Reasoning">{issue.reasoning}</Field>
                    <Field label="Business impact">{issue.businessImpact}</Field>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="mt-1 text-xs text-foreground/80">{children}</div>
  </div>
);