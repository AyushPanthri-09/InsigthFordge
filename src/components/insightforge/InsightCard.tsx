import type { AIInsight, Hypothesis } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Brain, Lightbulb, Activity, Target, ChevronDown, Eye, GitBranch, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const ICONS = {
  descriptive: Activity,
  diagnostic: Brain,
  predictive: Lightbulb,
  prescriptive: Target,
};

const TONES = {
  descriptive: "from-info/20 to-info/5 border-info/30",
  diagnostic: "from-primary/20 to-primary/5 border-primary/30",
  predictive: "from-warning/20 to-warning/5 border-warning/30",
  prescriptive: "from-success/20 to-success/5 border-success/30",
};

export function InsightCard({ insight }: { insight: AIInsight }) {
  const Icon = ICONS[insight.level];
  const tone = TONES[insight.level];
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-elevated overflow-hidden border bg-gradient-to-br ${tone}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/40">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {insight.level}
            </span>
            <ConfidenceBadge value={insight.confidence} />
          </div>
          <h3 className="text-base font-semibold leading-tight">{insight.title}</h3>
          <p className="mt-1.5 text-sm text-foreground/80">{insight.summary}</p>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/60"
          >
            <div className="space-y-4 p-5 text-sm">
              {insight.observation && (
                <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-info">
                    <Eye className="h-3 w-3" /> Observation
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">{insight.observation}</p>
                </div>
              )}
              <Section title="Reasoning">{insight.reasoning}</Section>
              {insight.hypotheses && insight.hypotheses.length > 0 && (
                <HypothesesBlock hypotheses={insight.hypotheses} />
              )}
              {insight.evidence.length > 0 && (
                <div>
                  <SectionTitle>Synthesis evidence</SectionTitle>
                  <ul className="mt-2 space-y-1.5">
                    {insight.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <EvidenceTag type={e.type} />
                        <span className="text-foreground/80">{e.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insight.conclusion && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <SectionTitle>Conclusion</SectionTitle>
                  <p className="mt-1 text-sm text-foreground/90">{insight.conclusion}</p>
                  <ConfidenceBadge value={insight.confidence} className="mt-2" />
                </div>
              )}
              {insight.recommendation && <Section title="Recommendation">{insight.recommendation}</Section>}
              {insight.assumptions && insight.assumptions.length > 0 && (
                <Section title="Assumptions">
                  <ul className="list-disc space-y-1 pl-4">{insight.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </Section>
              )}
              {insight.limitations && insight.limitations.length > 0 && (
                <Section title="Limitations">
                  <ul className="list-disc space-y-1 pl-4">{insight.limitations.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </Section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <SectionTitle>{title}</SectionTitle>
    <div className="mt-1.5 text-sm text-foreground/80">{children}</div>
  </div>
);
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</div>
);

function EvidenceTag({ type }: { type: "dataset" | "external" | "inference" }) {
  const map = {
    dataset: { label: "Dataset", cls: "bg-info/15 text-info" },
    external: { label: "External", cls: "bg-accent/15 text-accent" },
    inference: { label: "Inference", cls: "bg-warning/15 text-warning" },
  };
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[type].cls}`}>
      {map[type].label}
    </span>
  );
}

function HypothesesBlock({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const surviving = hypotheses
    .filter((h) => h.verdict !== "rejected")
    .slice()
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.confidence - a.confidence);
  const rejected = hypotheses.filter((h) => h.verdict === "rejected");

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <GitBranch className="h-3 w-3" /> Hypotheses tested ({hypotheses.length})
      </div>
      <ol className="mt-2 space-y-2">
        {surviving.map((h, i) => (
          <HypothesisCard key={`s${i}`} h={h} rank={i + 1} />
        ))}
        {rejected.map((h, i) => (
          <HypothesisCard key={`r${i}`} h={h} />
        ))}
      </ol>
    </div>
  );
}

function HypothesisCard({ h, rank }: { h: Hypothesis; rank?: number }) {
  const verdictMap = {
    supported: { Icon: CheckCircle2, cls: "bg-success/15 text-success", border: "border-success/30" },
    rejected: { Icon: XCircle, cls: "bg-destructive/15 text-destructive", border: "border-destructive/30 opacity-70" },
    inconclusive: { Icon: MinusCircle, cls: "bg-warning/15 text-warning", border: "border-warning/30" },
  } as const;
  const v = verdictMap[h.verdict];
  return (
    <li className={`rounded-lg border ${v.border} bg-background/40 p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {rank && (
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
              {rank}
            </span>
          )}
          <span className={`text-sm ${h.verdict === "rejected" ? "line-through opacity-70" : ""}`}>
            {h.statement}
          </span>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${v.cls}`}>
          <v.Icon className="h-3 w-3" /> {h.verdict}
        </span>
      </div>
      {h.rationale && (
        <p className="mt-1.5 text-xs italic text-foreground/70">{h.rationale}</p>
      )}
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {h.supportingEvidence?.length > 0 && (
          <EvidenceList title="Supporting" tone="success" items={h.supportingEvidence} />
        )}
        {h.opposingEvidence?.length > 0 && (
          <EvidenceList title="Opposing" tone="destructive" items={h.opposingEvidence} />
        )}
      </div>
      <ConfidenceBadge value={h.confidence} className="mt-2" />
    </li>
  );
}

function EvidenceList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "success" | "destructive";
  items: Array<{ type: "dataset" | "external" | "inference"; description: string }>;
}) {
  const cls = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="rounded-md border border-border/50 bg-background/30 p-2">
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${cls}`}>{title}</div>
      <ul className="mt-1 space-y-1">
        {items.map((e, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px]">
            <EvidenceTag type={e.type} />
            <span className="text-foreground/80">{e.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}