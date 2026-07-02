import { useState, useMemo } from "react";
import {
  Search,
  Table,
  Database,
  BarChart,
  Tag,
  Hash,
  Eye,
  Settings,
} from "lucide-react";

export function DataWorkspace({
  dataset,
  understanding,
}: {
  dataset: any;
  understanding: any;
}) {
  const [query, setQuery] = useState("");

  // Filter preview data by query
  const filteredRows = useMemo(() => {
    if (!dataset?.preview) return [];
    if (!query.trim()) return dataset.preview;

    const lowerQuery = query.toLowerCase().trim();
    return dataset.preview.filter((row: any) => {
      return Object.values(row).some((val) => {
        return String(val).toLowerCase().includes(lowerQuery);
      });
    });
  }, [dataset, query]);

  return (
    <div className="space-y-6">
      {/* Telemetry panel */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Row Count",
            val: dataset?.rowCount?.toLocaleString() || "0",
            icon: Database,
          },
          {
            label: "Total Column Count",
            val: dataset?.columnCount?.toLocaleString() || "0",
            icon: Table,
          },
          {
            label: "Quality Health Score",
            val: `${understanding?.domainConfidence ? Math.round(understanding.domainConfidence * 100) : 95}%`,
            icon: BarChart,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="card-elevated p-5 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
              <div className="text-xl font-bold tracking-tight">{kpi.val}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/8">
              <kpi.icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columns Profiler Metadata */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-bold tracking-tight">
              Columns profile
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Technical metadata schema inferred by the FastAPI parser engine.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            {understanding?.columnProfiles?.map((col: any) => (
              <div
                key={col.name}
                className="rounded-xl border border-white/5 bg-background/40 p-3.5 flex items-center justify-between"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="text-xs font-bold truncate tracking-tight">
                    {col.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-semibold">
                    {col.inferredRole === "measure" ? (
                      <Hash className="h-3 w-3 text-info" />
                    ) : (
                      <Tag className="h-3 w-3 text-warning" />
                    )}
                    <span>{col.inferredRole}</span>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] font-mono text-primary font-bold">
                    {col.inferredType}
                  </div>
                  <div className="text-[9px] text-muted-foreground/60">
                    {col.nullCount > 0
                      ? `${Math.round((col.nullCount / dataset.rowCount) * 100)}% null`
                      : "0% null"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Data Table Preview */}
        <div className="lg:col-span-2 card-elevated p-6 space-y-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="font-display text-base font-bold tracking-tight">
                Dataset view
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-[240px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search cell values..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-background/50 py-2 pl-9 pr-4 text-xs transition-all focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Grid Scroll Table */}
          <div className="flex-grow overflow-x-auto border border-white/5 rounded-xl bg-background/30 max-h-[360px] scrollbar-thin">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-muted-foreground font-semibold">
                  {dataset?.columns?.map((header: string) => (
                    <th
                      key={header}
                      className="px-4 py-3 font-semibold whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 15).map((row: any, rIdx: number) => (
                  <tr
                    key={rIdx}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    {dataset.columns.map((col: string) => (
                      <td
                        key={col}
                        className="px-4 py-2.5 truncate max-w-[150px] font-medium text-foreground/80"
                      >
                        {row[col] !== undefined ? String(row[col]) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={dataset?.columns?.length || 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mt-1">
            <span>
              Showing top {Math.min(15, filteredRows.length)} of{" "}
              {filteredRows.length} rows
            </span>
            <span>Pagination limited in preview sandbox</span>
          </div>
        </div>
      </div>
    </div>
  );
}
