import type { AIInsight, Hypothesis } from "@/services/analytics/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import {
  Brain,
  Lightbulb,
  Activity,
  Target,
  ChevronDown,
  Eye,
  GitBranch,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const ICONS = {
  descriptive: Activity,
  diagnostic: Brain,
  predictive: Lightbulb,
  prescriptive: Target,
};

const TONES = {
  descriptive: {
    border: "border-info/25",
    bg: "from-info/12 to-transparent",
    icon: "bg-info/15 text-info",
  },
  diagnostic: {
    border: "border-primary/25",
    bg: "from-primary/12 to-transparent",
    icon: "bg-primary/15 text-primary",
  },
  predictive: {
    border: "border-warning/25",
    bg: "from-warning/12 to-transparent",
    icon: "bg-warning/15 text-warning",
  },
  prescriptive: {
    border: "border-success/25",
    bg: "from-success/12 to-transparent",
    icon: "bg-success/15 text-success",
  },
};

export function InsightCard({ insight }: { insight: AIInsight }) {
  const Icon = ICONS[insight.level];
  const tone = TONES[insight.level];
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-elevated overflow-hidden border bg-gradient-to-b ${tone.bg} ${tone.border}`}
    >
      {/* Summary row — clickable */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Level icon */}
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="section-label">{insight.level}</span>
            <ConfidenceBadge value={insight.confidence} />
          </div>
          <h3 className="text-sm font-semibold leading-snug">
            {insight.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
            {insight.summary}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-border/60"
          >
            <div className="space-y-4 px-5 py-5 text-sm">
              {/* Observation */}
              {insight.observation && (
                <InfoPanel icon={Eye} label="Observation" tone="info">
                  {insight.observation}
                </InfoPanel>
              )}

              {/* Reasoning */}
              <Field label="Reasoning">{insight.reasoning}</Field>

              {/* Hypotheses */}
              {insight.hypotheses && insight.hypotheses.length > 0 && (
                <HypothesesBlock hypotheses={insight.hypotheses} />
              )}

              {/* Evidence */}
              {insight.evidence.length > 0 && (
                <div>
                  <FieldLabel>Synthesis evidence</FieldLabel>
                  <ul className="mt-2 space-y-1.5">
                    {insight.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <EvidenceTag type={e.type} />
                        <span className="text-foreground/80">
                          {e.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conclusion */}
              {insight.conclusion && (
                <InfoPanel
                  icon={CheckCircle2}
                  label="Conclusion"
                  tone="primary"
                >
                  {insight.conclusion}
                  <div className="mt-2">
                    <ConfidenceBadge value={insight.confidence} />
                  </div>
                </InfoPanel>
              )}

              {/* Recommendation */}
              {insight.recommendation && (
                <Field label="Recommendation">{insight.recommendation}</Field>
              )}

              {/* Assumptions */}
              {insight.assumptions && insight.assumptions.length > 0 && (
                <Field label="Assumptions">
                  <ul className="list-disc space-y-1 pl-4">
                    {insight.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Field>
              )}

              {/* Limitations */}
              {insight.limitations && insight.limitations.length > 0 && (
                <Field label="Limitations">
                  <ul className="list-disc space-y-1 pl-4">
                    {insight.limitations.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Field>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

const TONE_STYLES = {
  info: "border-info/25 bg-info/5 text-info",
  primary: "border-primary/25 bg-primary/5 text-primary",
  warning: "border-warning/25 bg-warning/5 text-warning",
};

function InfoPanel({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: React.ElementType;
  label: string;
  tone: keyof typeof TONE_STYLES;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${TONE_STYLES[tone].split(" ").slice(0, 2).join(" ")}`}
    >
      <div
        className={`flex items-center gap-1.5 ${TONE_STYLES[tone].split(" ")[2]}`}
      >
        <Icon className="h-3 w-3" />
        <span className="section-label">{label}</span>
      </div>
      <div className="mt-1.5 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="field-label">{children}</div>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="mt-1.5 text-sm text-foreground/80">{children}</div>
  </div>
);

function EvidenceTag({ type }: { type: "dataset" | "external" | "inference" }) {
  const map = {
    dataset: { label: "Dataset", cls: "bg-info/15 text-info" },
    external: { label: "External", cls: "bg-accent/15 text-accent" },
    inference: { label: "Inference", cls: "bg-warning/15 text-warning" },
  };
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[type].cls}`}
    >
      {map[type].label}
    </span>
  );
}

function HypothesesBlock({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const surviving = hypotheses
    .filter((h) => h.verdict !== "rejected")
    .slice()
    .sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.confidence - a.confidence,
    );
  const rejected = hypotheses.filter((h) => h.verdict === "rejected");

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <GitBranch className="h-3 w-3 text-muted-foreground" />
        <FieldLabel>Hypotheses tested ({hypotheses.length})</FieldLabel>
      </div>
      <ol className="space-y-2">
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
    supported: {
      Icon: CheckCircle2,
      cls: "bg-success/12 text-success",
      border: "border-success/25",
    },
    rejected: {
      Icon: XCircle,
      cls: "bg-destructive/12 text-destructive",
      border: "border-destructive/25 opacity-65",
    },
    inconclusive: {
      Icon: MinusCircle,
      cls: "bg-warning/12 text-warning",
      border: "border-warning/25",
    },
  } as const;
  const v = verdictMap[h.verdict];

  return (
    <li className={`rounded-xl border bg-background/30 p-3.5 ${v.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {rank && (
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
              {rank}
            </span>
          )}
          <span
            className={`text-sm ${h.verdict === "rejected" ? "line-through opacity-60" : ""}`}
          >
            {h.statement}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${v.cls}`}
        >
          <v.Icon className="h-3 w-3" /> {h.verdict}
        </span>
      </div>

      {h.rationale && (
        <p className="mt-2 text-xs italic text-foreground/65">{h.rationale}</p>
      )}

      {(h.supportingEvidence?.length > 0 || h.opposingEvidence?.length > 0) && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {h.supportingEvidence?.length > 0 && (
            <EvidenceList
              title="Supporting"
              tone="success"
              items={h.supportingEvidence}
            />
          )}
          {h.opposingEvidence?.length > 0 && (
            <EvidenceList
              title="Opposing"
              tone="destructive"
              items={h.opposingEvidence}
            />
          )}
        </div>
      )}

      <div className="mt-2.5">
        <ConfidenceBadge value={h.confidence} />
      </div>
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
  items: Array<{
    type: "dataset" | "external" | "inference";
    description: string;
  }>;
}) {
  const cls = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-2.5">
      <div className={`field-label ${cls}`}>{title}</div>
      <ul className="mt-1.5 space-y-1.5">
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
