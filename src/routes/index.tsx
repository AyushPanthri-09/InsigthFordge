import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight, Brain, FileSearch, Sparkles, ShieldCheck, BarChart3,
  Target, Lightbulb, Activity, FileText,
} from "lucide-react";
import { Brand } from "@/components/insightforge/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsightForge AI — Autonomous AI Data Scientist & Business Consultant" },
      { name: "description", content: "Drop any CSV or XLSX. InsightForge AI understands the business context, cleans with reasoning, and delivers four levels of evidence-backed insights." },
      { property: "og:title", content: "InsightForge AI — Premium AI Analytics" },
      { property: "og:description", content: "Understand. Clean. Analyze. Predict. Recommend. Every step transparent and evidence-backed." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#capabilities" className="transition hover:text-foreground">Capabilities</a>
          <a href="#how" className="transition hover:text-foreground">How it works</a>
          <a href="#philosophy" className="transition hover:text-foreground">Philosophy</a>
        </nav>
        <Link
          to="/workspace"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground ai-glow hover:opacity-95"
        >
          Launch workspace <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-12">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative grid place-items-center pt-12 text-center"
        >
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Autonomous AI Data Scientist
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Never analyze before <span className="gradient-text">understanding</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            InsightForge AI reads your dataset the way a senior data scientist would.
            It identifies the business context, justifies every cleaning decision, runs
            four levels of analytics, and delivers evidence-backed recommendations — not
            just statistics.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/workspace"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground ai-glow hover:opacity-95"
            >
              Upload your dataset <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#capabilities"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              See what it does
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Evidence-backed</span>
            <span className="inline-flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-primary" /> Explainable reasoning</span>
            <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-info" /> Executive PDF reports</span>
          </div>
        </motion.section>

        <section id="how" className="mt-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            From raw file to trusted decision
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            Five stages. Every decision logged. Every conclusion backed by evidence.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {PIPELINE.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="card-elevated p-5"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-primary">{i + 1}</span>
                  Stage
                </div>
                <div className="mt-3"><s.Icon className="h-5 w-5 text-primary" /></div>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="capabilities" className="mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="card-elevated p-6"
            >
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${c.tone}`}>
                <c.Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </motion.div>
          ))}
        </section>

        <section id="philosophy" className="mt-24">
          <div className="card-elevated relative overflow-hidden p-10 md:p-14">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/15" />
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                Built on a single, uncompromising philosophy
              </h2>
              <div className="mt-6 grid gap-3 text-sm text-foreground/85 md:grid-cols-2">
                {PHILOSOPHY.map((p) => (
                  <div key={p} className="rounded-xl border border-border/60 bg-background/40 p-3">{p}</div>
                ))}
              </div>
              <Link
                to="/workspace"
                className="ai-glow mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Start your first analysis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
          <Brand compact />
          <div>InsightForge AI · Evidence-driven analytics</div>
        </div>
      </footer>
    </div>
  );
}

const PIPELINE = [
  { title: "Understand", desc: "Domain detection, column semantics, primary keys, KPIs, relationships.", Icon: FileSearch },
  { title: "Clean", desc: "Reasoning-justified cleaning with confidence and business impact.", Icon: ShieldCheck },
  { title: "Explore", desc: "Stats, distributions, correlations, and auto-selected visualizations.", Icon: BarChart3 },
  { title: "Analyze", desc: "Descriptive · Diagnostic · Predictive · Prescriptive — with evidence.", Icon: Brain },
  { title: "Report", desc: "Executive PDF with reasoning logs and prioritized recommendations.", Icon: FileText },
];

const CAPABILITIES = [
  { title: "Descriptive analytics", desc: "What happened — KPIs, trends, and patterns derived directly from the dataset.", Icon: Activity, tone: "bg-info/15 text-info" },
  { title: "Diagnostic reasoning", desc: "Why it happened — multiple hypotheses tested against evidence, ranked by confidence.", Icon: Brain, tone: "bg-primary/15 text-primary" },
  { title: "Predictive forecasts", desc: "What will happen — only when supported by the data, with assumptions and limitations spelled out.", Icon: Lightbulb, tone: "bg-warning/15 text-warning" },
  { title: "Prescriptive recommendations", desc: "What to do — prioritized actions tied to evidence and expected business impact.", Icon: Target, tone: "bg-success/15 text-success" },
  { title: "Analyst Notes", desc: "Optional human guidance: ignore cancelled orders, treat rows as metadata, focus on retention. Never mandatory.", Icon: Sparkles, tone: "bg-accent/15 text-accent" },
  { title: "Evidence panels", desc: "Every claim tagged: Dataset Evidence, External Context, Business Inference — with confidence scores.", Icon: ShieldCheck, tone: "bg-success/15 text-success" },
];

const PHILOSOPHY = [
  "Never analyze before understanding.",
  "Never conclude without evidence.",
  "Never predict without assumptions.",
  "Never recommend without justification.",
];