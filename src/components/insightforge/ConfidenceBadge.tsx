import { cn } from "@/lib/utils";

const TIERS = [
  { min: 80, cls: "text-success border-success/30 bg-success/8" },
  { min: 60, cls: "text-info border-info/30 bg-info/8" },
  { min: 40, cls: "text-warning border-warning/30 bg-warning/8" },
  { min: 0, cls: "text-destructive border-destructive/30 bg-destructive/8" },
] as const;

function getTier(pct: number) {
  return TIERS.find((t) => pct >= t.min) ?? TIERS[TIERS.length - 1];
}

export function ConfidenceBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const tier = getTier(pct);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tier.cls,
        className,
      )}
      aria-label={`Confidence: ${pct}%`}
      title={`Confidence: ${pct}%`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {pct}%
    </span>
  );
}
