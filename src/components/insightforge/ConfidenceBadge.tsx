import { cn } from "@/lib/utils";

export function ConfidenceBadge({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 80 ? "text-success border-success/30 bg-success/10"
    : pct >= 60 ? "text-info border-info/30 bg-info/10"
    : pct >= 40 ? "text-warning border-warning/30 bg-warning/10"
    : "text-destructive border-destructive/30 bg-destructive/10";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
        className,
      )}
      title={`Confidence: ${pct}%`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {pct}% confidence
    </span>
  );
}