import { cn } from "@/lib/utils";

const SCORE_CONFIG = [
  { min: 75, label: "Healthy",  color: "text-success", bar: "bg-success", ring: "bg-success/15 border-success/30" },
  { min: 50, label: "Fair",     color: "text-warning", bar: "bg-warning", ring: "bg-warning/15 border-warning/30" },
  { min: 0,  label: "At Risk",  color: "text-destructive", bar: "bg-destructive", ring: "bg-destructive/15 border-destructive/30" },
] as const;

function getConfig(score: number) {
  return SCORE_CONFIG.find((c) => score >= c.min) ?? SCORE_CONFIG[SCORE_CONFIG.length - 1];
}

export function HealthScoreCard({
  score,
  summary,
}: {
  score: number;
  summary: string;
}) {
  const cfg = getConfig(score);

  return (
    <div className="card-elevated relative overflow-hidden p-6">
      {/* Very subtle ambient gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-transparent" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
        {/* Score block */}
        <div className="shrink-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Business Health Score
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className={cn("font-display text-6xl font-semibold tabular-nums", cfg.color)}>
              {score}
            </div>
            <div className="mb-1.5 text-sm text-muted-foreground">/100</div>
          </div>
          {/* Status pill */}
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
              cfg.ring,
              cfg.color,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.bar)} />
            {cfg.label}
          </span>
        </div>

        {/* Summary + bar */}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-foreground/85">{summary}</p>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Score</span>
              <span className="tabular-nums">{score}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn("h-full rounded-full transition-all duration-700", cfg.bar)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}