import type { ReasoningStep } from "@/services/analytics/types";
import { motion } from "motion/react";
import { Cpu } from "lucide-react";

const PHASE_CONFIG: Record<
  ReasoningStep["phase"],
  { dot: string; badge: string }
> = {
  understanding: { dot: "bg-info",    badge: "bg-info/10 text-info" },
  profiling:     { dot: "bg-accent",  badge: "bg-accent/10 text-accent" },
  cleaning:      { dot: "bg-warning", badge: "bg-warning/10 text-warning" },
  eda:           { dot: "bg-accent",  badge: "bg-accent/10 text-accent" },
  analytics:     { dot: "bg-primary", badge: "bg-primary/10 text-primary" },
  reporting:     { dot: "bg-success", badge: "bg-success/10 text-success" },
};

export function ReasoningLog({ steps }: { steps: ReasoningStep[] }) {
  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Cpu className="h-3.5 w-3.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Reasoning Log</h3>
          <p className="text-[11px] text-muted-foreground">Every decision, in order.</p>
        </div>
        {steps.length > 0 && (
          <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {steps.length}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="scrollbar-thin max-h-[480px] overflow-y-auto">
        {steps.length === 0 ? (
          <div className="empty-state py-10">
            <Cpu className="h-8 w-8 opacity-25" />
            <p className="text-sm">Reasoning steps will appear here during analysis.</p>
          </div>
        ) : (
          <ol className="px-5 py-4">
            {steps.map((s, i) => {
              const cfg = PHASE_CONFIG[s.phase];
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-3 pb-4 last:pb-0"
                >
                  {/* Timeline line */}
                  {i < steps.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-border/60" />
                  )}
                  {/* Dot */}
                  <span
                    className={`relative mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-background ${cfg.dot}`}
                  />
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}
                      >
                        {s.phase}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-snug text-foreground/90">{s.message}</p>
                    {s.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}