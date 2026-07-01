import type { ReasoningStep } from "@/services/analytics/types";
import { motion } from "motion/react";

const PHASE_TONE: Record<ReasoningStep["phase"], string> = {
  understanding: "bg-info",
  profiling: "bg-accent",
  cleaning: "bg-warning",
  eda: "bg-accent",
  analytics: "bg-primary",
  reporting: "bg-success",
};

export function ReasoningLog({ steps }: { steps: ReasoningStep[] }) {
  return (
    <div className="card-elevated p-5">
      <h3 className="text-sm font-semibold">Reasoning Log</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Every decision, in order.</p>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start gap-3"
          >
            <div className="relative">
              <span className={`block h-2 w-2 rounded-full ${PHASE_TONE[s.phase]}`} />
              {i < steps.length - 1 && <span className="absolute left-1/2 top-3 h-7 w-px -translate-x-1/2 bg-border" />}
            </div>
            <div className="-mt-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.phase}</span>
              </div>
              <p className="text-sm leading-snug text-foreground/90">{s.message}</p>
              {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}