import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Download, Sparkles, RefreshCw } from "lucide-react";
import { Brand } from "@/components/insightforge/Brand";
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
  "overview" | "understanding" | "cleaning" | "eda" | "analytics" | "report";

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

      <header className="glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Brand />
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/40"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> New analysis
                </button>
                <button
                  onClick={() => downloadExecutivePdf(analysis)}
                  className="ai-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Download className="h-3.5 w-3.5" /> Executive PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {!analysis ? (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight">
                  Begin a new analysis
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Drop a CSV or XLSX. InsightForge AI will understand its
                  business context, justify every cleaning decision, run EDA,
                  and produce four levels of analytics.
                </p>
              </div>
              <UploadDropzone onFile={run} disabled={busy} />
              <div className="card-elevated p-4 text-xs text-muted-foreground">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                Your file is processed in your session. Sensitive data never
                leaves the analysis context.
              </div>
            </div>
            <AnalystNotesPanel
              value={notes}
              onChange={setNotes}
              disabled={busy}
            />
          </div>
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
    </div>
  );
}

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
      { id: "report", label: "Report" },
    ],
    [analysis],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {analysis.dataset.fileName}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {analysis.dataset.rowCount.toLocaleString()} rows ×{" "}
            {analysis.dataset.columnCount} columns · Domain:{" "}
            <span className="text-foreground">
              {analysis.understanding.domain}
            </span>
          </p>
        </div>
      </div>

      <div className="scrollbar-thin -mx-2 flex gap-1 overflow-x-auto px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] tabular-nums">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
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
          {tab === "report" && <ReportTab analysis={analysis} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

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
      <div className="space-y-6 lg:col-span-2">
        <HealthScoreCard
          score={analysis.analytics.businessHealthScore}
          summary={analysis.analytics.executiveSummary}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {analysis.eda.kpis.slice(0, 8).map((k) => (
            <KpiCard key={k.id} kpi={k} />
          ))}
        </div>
        {analysis.eda.charts[0] && <ChartCard spec={analysis.eda.charts[0]} />}
        {topInsights.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Top AI Insights</h2>
              <span className="text-xs text-muted-foreground">
                Click to expand evidence
              </span>
            </div>
            {topInsights.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-6">
        <ReasoningLog steps={analysis.reasoningLog} />
        <AnalystNotesPanel value={notes} onChange={onNotesChange} />
      </div>
    </div>
  );
}

function EDATab({ analysis }: { analysis: FullAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {analysis.eda.kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.eda.charts.map((c) => (
          <ChartCard key={c.id} spec={c} />
        ))}
      </div>
      {analysis.eda.correlations.length > 0 && (
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold">Top Correlations</h3>
          <p className="text-xs text-muted-foreground">
            Pearson correlations between numeric measures.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {analysis.eda.correlations.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3"
              >
                <div className="text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.a}
                  </span>
                  <span className="mx-2 text-muted-foreground">↔</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.b}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${c.strength === "strong" ? "bg-success/15 text-success" : c.strength === "moderate" ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.strength}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
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

function AnalyticsTab({ analysis }: { analysis: FullAnalysis }) {
  const sections: Array<{
    id: string;
    title: string;
    subtitle: string;
    items: typeof analysis.analytics.descriptive;
  }> = [
    {
      id: "desc",
      title: "Descriptive",
      subtitle: "What happened — observed from the data.",
      items: analysis.analytics.descriptive,
    },
    {
      id: "diag",
      title: "Diagnostic",
      subtitle: "Why it happened — hypotheses tested against evidence.",
      items: analysis.analytics.diagnostic,
    },
    {
      id: "pred",
      title: "Predictive",
      subtitle: "What may happen — with explicit assumptions and limitations.",
      items: analysis.analytics.predictive,
    },
    {
      id: "presc",
      title: "Prescriptive",
      subtitle: "What to do — prioritized, justified recommendations.",
      items: analysis.analytics.prescriptive,
    },
  ];
  return (
    <div className="space-y-8">
      <HealthScoreCard
        score={analysis.analytics.businessHealthScore}
        summary={analysis.analytics.executiveSummary}
      />
      {sections.map((s) => (
        <section key={s.id}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{s.title}</h2>
              <p className="text-xs text-muted-foreground">{s.subtitle}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {s.items.length} insight{s.items.length === 1 ? "" : "s"}
            </span>
          </div>
          {s.items.length === 0 ? (
            <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
              No {s.title.toLowerCase()} insights generated for this dataset.
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
            Live preview of the full 9-page PDF report
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="ai-glow inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>

      {/* Live preview — scrollable, scaled to fit viewport */}
      <div
        className="overflow-auto rounded-xl border border-border/60 bg-[#0f0e1a]"
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
