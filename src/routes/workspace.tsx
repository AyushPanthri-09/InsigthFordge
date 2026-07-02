import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Download,
  Sparkles,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Brand } from "@/components/insightforge/Brand";
import { Footer } from "@/components/insightforge/Footer";
import { UploadDropzone } from "@/components/insightforge/UploadDropzone";
import { AnalystNotesPanel } from "@/components/insightforge/AnalystNotes";
import { ProgressOverlay } from "@/components/insightforge/ProgressOverlay";
import { DatasetUnderstandingView } from "@/components/insightforge/DatasetUnderstandingView";
import { CleaningReportView } from "@/components/insightforge/CleaningReportView";
import { KpiCard } from "@/components/insightforge/KpiCard";
import { ChartCard } from "@/components/insightforge/ChartCard";
import { InsightCard } from "@/components/insightforge/InsightCard";
import { ReasoningLog } from "@/components/insightforge/ReasoningLog";
import { HealthScoreCard } from "@/components/insightforge/HealthScoreCard";
import { Toaster } from "@/components/ui/sonner";
import { analyticsService } from "@/services/analytics";
import type { FullAnalysis, ReasoningStep } from "@/services/analytics/types";
import { downloadExecutivePdf } from "@/lib/report-engine/render";
import { buildReportDocument } from "@/lib/report-engine/builder";
import { HtmlReportDocument } from "@/lib/report-engine/HtmlReportDocument";
import { cn } from "@/lib/utils";
import { PredictiveSandbox } from "@/components/insightforge/PredictiveSandbox";
import { DataWorkspace } from "@/components/insightforge/DataWorkspace";
import { AiCopilot } from "@/components/insightforge/AiCopilot";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace · InsightForge AI" },
      {
        name: "description",
        content:
          "Upload a dataset and let InsightForge AI run the complete analyst workflow.",
      },
    ],
  }),
  component: Workspace,
});

type Tab =
  | "overview"
  | "understanding"
  | "cleaning"
  | "eda"
  | "analytics"
  | "sandbox"
  | "data"
  | "report";

function Workspace() {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [current, setCurrent] = useState("");
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const run = useCallback(
    async (file: File) => {
      setBusy(true);
      setSteps([]);
      setCurrent("Starting analysis…");
      setAnalysis(null);
      try {
        const result = await analyticsService.analyzeAll(file, {
          notes: notes.trim() ? { text: notes.trim() } : undefined,
          onProgress: (s) => {
            setSteps((prev) => [...prev, s]);
            setCurrent(s.message);
          },
        });
        setAnalysis(result);
        setTab("overview");
        toast.success("Analysis complete", {
          description: `${result.dataset.fileName} · ${result.dataset.rowCount.toLocaleString()} rows`,
        });
      } catch (e) {
        console.error(e);
        toast.error("Analysis failed", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setBusy(false);
      }
    },
    [notes],
  );

  const reset = () => {
    setAnalysis(null);
    setSteps([]);
    setCurrent("");
  };

  return (
    <div className="min-h-screen">
      <Toaster richColors closeButton position="top-center" />
      <ProgressOverlay open={busy} steps={steps} current={current} />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="group flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            </Link>
            <div className="h-4 w-px bg-border/60" />
            <Brand />
          </div>

          <div className="flex items-center gap-2">
            {analysis && (
              <>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> New analysis
                </button>
                <button
                  onClick={() => downloadExecutivePdf(analysis)}
                  className="ai-glow inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" /> Executive PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1400px] px-6 py-10">
        {!analysis ? (
          <UploadState
            notes={notes}
            setNotes={setNotes}
            run={run}
            busy={busy}
          />
        ) : (
          <Dashboard
            analysis={analysis}
            tab={tab}
            onTab={setTab}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}
      </main>
      {analysis && (
        <AiCopilot
          dataset={analysis.dataset}
          understanding={analysis.understanding}
        />
      )}
      <Footer />
    </div>
  );
}

/* ── Upload State ─────────────────────────────────────────── */
function UploadState({
  notes,
  setNotes,
  run,
  busy,
}: {
  notes: string;
  setNotes: (v: string) => void;
  run: (f: File) => void;
  busy: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_340px]"
    >
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Begin a new analysis
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Drop a CSV or XLSX. InsightForge AI will understand its business
            context, justify every cleaning decision, run EDA, and produce four
            levels of analytics.
          </p>
        </div>
        <UploadDropzone onFile={run} disabled={busy} />
        <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/30 p-3.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Your file is processed entirely in your session. Sensitive data
            never leaves the analysis context.
          </span>
        </div>
      </div>
      <AnalystNotesPanel value={notes} onChange={setNotes} disabled={busy} />
    </motion.div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */
function Dashboard({
  analysis,
  tab,
  onTab,
  notes,
  onNotesChange,
}: {
  analysis: FullAnalysis;
  tab: Tab;
  onTab: (t: Tab) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const tabs: Array<{ id: Tab; label: string; count?: number }> = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "understanding", label: "Understanding" },
      {
        id: "cleaning",
        label: "Cleaning",
        count: analysis.cleaning.issues.length,
      },
      { id: "eda", label: "EDA", count: analysis.eda.charts.length },
      {
        id: "analytics",
        label: "Analytics",
        count:
          analysis.analytics.descriptive.length +
          analysis.analytics.diagnostic.length +
          analysis.analytics.predictive.length +
          analysis.analytics.prescriptive.length,
      },
      { id: "sandbox", label: "Predictive Sandbox" },
      { id: "data", label: "Data Workspace" },
      { id: "report", label: "Report" },
    ],
    [analysis],
  );

  return (
    <div className="space-y-6">
      {/* Dataset title row */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {analysis.dataset.fileName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {analysis.dataset.rowCount.toLocaleString()}
            </span>{" "}
            rows ×{" "}
            <span className="tabular-nums">{analysis.dataset.columnCount}</span>{" "}
            columns · Domain:{" "}
            <span className="font-medium text-foreground/90">
              {analysis.understanding.domain}
            </span>
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="scrollbar-thin -mx-1 flex gap-0.5 overflow-x-auto px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150",
              tab === t.id
                ? "bg-primary/12 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "ml-2 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums font-semibold",
                  tab === t.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/70 text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {tab === "overview" && (
            <OverviewTab
              analysis={analysis}
              notes={notes}
              onNotesChange={onNotesChange}
            />
          )}
          {tab === "understanding" && (
            <DatasetUnderstandingView data={analysis.understanding} />
          )}
          {tab === "cleaning" && (
            <CleaningReportView report={analysis.cleaning} />
          )}
          {tab === "eda" && <EDATab analysis={analysis} />}
          {tab === "analytics" && <AnalyticsTab analysis={analysis} />}
          {tab === "sandbox" && (
            <PredictiveSandbox dataset={analysis.dataset} />
          )}
          {tab === "data" && (
            <DataWorkspace
              dataset={analysis.dataset}
              understanding={analysis.understanding}
            />
          )}
          {tab === "report" && <ReportTab analysis={analysis} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Overview Tab ─────────────────────────────────────────── */
function OverviewTab({
  analysis,
  notes,
  onNotesChange,
}: {
  analysis: FullAnalysis;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const topInsights = [
    ...analysis.analytics.diagnostic.slice(0, 1),
    ...analysis.analytics.prescriptive.slice(0, 2),
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main column */}
      <div className="space-y-6 lg:col-span-2">
        <HealthScoreCard
          score={analysis.analytics.businessHealthScore}
          summary={analysis.analytics.executiveSummary}
        />

        {/* KPI grid */}
        <div>
          <SectionHeader title="Key Metrics" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {analysis.eda.kpis.slice(0, 8).map((k) => (
              <KpiCard key={k.id} kpi={k} />
            ))}
          </div>
        </div>

        {/* Featured chart */}
        {analysis.eda.charts[0] && <ChartCard spec={analysis.eda.charts[0]} />}

        {/* Top insights */}
        {topInsights.length > 0 && (
          <div>
            <SectionHeader
              title="Top AI Insights"
              subtitle="Click any card to expand evidence"
            />
            <div className="mt-3 space-y-3">
              {topInsights.map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <ReasoningLog steps={analysis.reasoningLog} />
        <AnalystNotesPanel value={notes} onChange={onNotesChange} />
      </div>
    </div>
  );
}

/* ── EDA Tab ──────────────────────────────────────────────── */
function EDATab({ analysis }: { analysis: FullAnalysis }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div>
        <SectionHeader title="Key Performance Indicators" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {analysis.eda.kpis.map((k) => (
            <KpiCard key={k.id} kpi={k} />
          ))}
        </div>
      </div>

      {/* Charts */}
      {analysis.eda.charts.length > 0 && (
        <div>
          <SectionHeader
            title="Visualizations"
            count={analysis.eda.charts.length}
          />
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {analysis.eda.charts.map((c) => (
              <ChartCard key={c.id} spec={c} />
            ))}
          </div>
        </div>
      )}

      {/* Correlations */}
      {analysis.eda.correlations.length > 0 && (
        <div className="card-elevated p-5">
          <SectionHeader
            title="Top Correlations"
            subtitle="Pearson correlations between numeric measures."
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {analysis.eda.correlations.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:bg-muted/20"
              >
                <div className="flex min-w-0 items-center gap-1.5 text-xs">
                  <code className="truncate font-mono text-[11px] text-muted-foreground">
                    {c.a}
                  </code>
                  <span className="shrink-0 text-muted-foreground">↔</span>
                  <code className="truncate font-mono text-[11px] text-muted-foreground">
                    {c.b}
                  </code>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      c.strength === "strong"
                        ? "bg-success/15 text-success"
                        : c.strength === "moderate"
                          ? "bg-info/15 text-info"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.strength}
                  </span>
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {c.r.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analytics Tab ────────────────────────────────────────── */
function AnalyticsTab({ analysis }: { analysis: FullAnalysis }) {
  const sections: Array<{
    id: string;
    title: string;
    subtitle: string;
    dot: string;
    items: typeof analysis.analytics.descriptive;
  }> = [
    {
      id: "desc",
      title: "Descriptive",
      subtitle: "What happened — observed from the data.",
      dot: "bg-info",
      items: analysis.analytics.descriptive,
    },
    {
      id: "diag",
      title: "Diagnostic",
      subtitle: "Why it happened — hypotheses tested against evidence.",
      dot: "bg-primary",
      items: analysis.analytics.diagnostic,
    },
    {
      id: "pred",
      title: "Predictive",
      subtitle: "What may happen — with explicit assumptions and limitations.",
      dot: "bg-warning",
      items: analysis.analytics.predictive,
    },
    {
      id: "presc",
      title: "Prescriptive",
      subtitle: "What to do — prioritized, justified recommendations.",
      dot: "bg-success",
      items: analysis.analytics.prescriptive,
    },
  ];
  return (
    <div className="space-y-10">
      <HealthScoreCard
        score={analysis.analytics.businessHealthScore}
        summary={analysis.analytics.executiveSummary}
      />
      {sections.map((s) => (
        <section key={s.id}>
          <div className="mb-4 flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-base font-semibold">{s.title}</h2>
                <span className="text-xs text-muted-foreground">
                  {s.items.length} insight{s.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{s.subtitle}</p>
            </div>
          </div>
          {s.items.length === 0 ? (
            <div className="card-elevated empty-state">
              <BarChart3 className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                No {s.title.toLowerCase()} insights generated for this dataset.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {s.items.map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/* ── Report Tab ───────────────────────────────────────────── */
function ReportTab({ analysis }: { analysis: FullAnalysis }) {
  const [downloading, setDownloading] = useState(false);
  const doc = useMemo(() => buildReportDocument(analysis), [analysis]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExecutivePdf(analysis);
    } catch (e) {
      toast.error("PDF generation failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Enterprise Report Preview</h2>
          <p className="text-xs text-muted-foreground">
            Live preview of the full 13-page PDF report
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="ai-glow inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>

      {/* Live preview */}
      <div
        className="scrollbar-thin overflow-auto rounded-xl border border-border/60 bg-[#0f0e1a]"
        style={{ maxHeight: "80vh" }}
      >
        <div
          style={{
            transform: "scale(0.85)",
            transformOrigin: "top center",
            width: "794px",
            margin: "0 auto",
          }}
        >
          <HtmlReportDocument doc={doc} />
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ────────────────────────────────── */
function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {count !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}
