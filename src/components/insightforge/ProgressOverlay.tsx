import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import type { ReasoningStep } from "@/services/analytics/types";

export function ProgressOverlay({
  open,
  steps,
  current,
}: {
  open: boolean;
  steps: ReasoningStep[];
  current: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="card-elevated w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <div className="text-sm font-semibold">Analyzing your dataset</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{current}</div>
              </div>
            </div>
            <div className="scrollbar-thin mt-5 max-h-64 space-y-2 overflow-auto">
              {steps.slice(-8).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.phase}</span>
                  <span className="truncate text-foreground/80">{s.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}