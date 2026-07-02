import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import type { ReasoningStep } from "@/services/analytics/types";

const PHASE_CONFIG: Record<
  ReasoningStep["phase"],
  { dot: string; label: string }
> = {
  understanding: { dot: "bg-info", label: "Understanding" },
  profiling: { dot: "bg-accent", label: "Profiling" },
  cleaning: { dot: "bg-warning", label: "Cleaning" },
  eda: { dot: "bg-accent", label: "EDA" },
  analytics: { dot: "bg-primary", label: "Analytics" },
  reporting: { dot: "bg-success", label: "Reporting" },
};

const PHASE_ORDER: ReasoningStep["phase"][] = [
  "understanding",
  "profiling",
  "cleaning",
  "eda",
  "analytics",
  "reporting",
];
const TOTAL_PHASES = PHASE_ORDER.length;

export function ProgressOverlay({
  open,
  steps,
  current,
}: {
  open: boolean;
  steps: ReasoningStep[];
  current: string;
}) {
  const seenPhases = new Set(steps.map((s) => s.phase));
  const latestPhase = steps.length > 0 ? steps[steps.length - 1].phase : null;
  const latestIdx = latestPhase ? PHASE_ORDER.indexOf(latestPhase) : -1;
  const progress = Math.min(
    Math.round(((latestIdx + 1) / TOTAL_PHASES) * 90) +
      (steps.length > 0 ? 5 : 0),
    95,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-xl"
          aria-modal="true"
          role="dialog"
          aria-label="Analysis in progress"
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="card-elevated w-full max-w-md overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-0.5 w-full bg-muted/40">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10"
                >
                  <Loader2 className="h-5 w-5 text-primary" />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    Analyzing your dataset
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="mt-0.5 truncate text-xs text-muted-foreground"
                    >
                      {current}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {progress}%
                </div>
              </div>

              {/* Phase pills */}
              <div className="mt-5 flex flex-wrap gap-1.5">
                {PHASE_ORDER.map((phase) => {
                  const cfg = PHASE_CONFIG[phase];
                  const active = phase === latestPhase;
                  const done = seenPhases.has(phase) && !active;
                  return (
                    <motion.span
                      key={phase}
                      animate={{
                        opacity: done ? 0.5 : 1,
                        scale: active ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.25 }}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        active
                          ? "bg-primary/15 text-primary"
                          : done
                            ? "bg-muted/60 text-muted-foreground line-through"
                            : "bg-muted/30 text-muted-foreground/50"
                      }`}
                    >
                      {active && (
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                        />
                      )}
                      {cfg.label}
                    </motion.span>
                  );
                })}
              </div>

              {/* Recent steps */}
              <div className="scrollbar-thin mt-4 max-h-40 space-y-1.5 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {steps.slice(-6).map((s, i) => {
                    const cfg = PHASE_CONFIG[s.phase];
                    return (
                      <motion.div
                        key={`${s.phase}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`}
                        />
                        <span className="truncate text-foreground/70">
                          {s.message}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
