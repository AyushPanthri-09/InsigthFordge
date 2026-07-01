export function HealthScoreCard({ score, summary }: { score: number; summary: string }) {
  const tone = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className="card-elevated relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
      <div className="relative">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Business Health Score</div>
        <div className="mt-2 flex items-end gap-3">
          <div className={`font-display text-6xl font-semibold tabular-nums ${tone}`}>{score}</div>
          <div className="pb-2 text-sm text-muted-foreground">/ 100</div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/85">{summary}</p>
      </div>
    </div>
  );
}