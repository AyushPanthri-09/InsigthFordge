import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Percent,
  Sparkles,
  Sliders,
  HelpCircle,
} from "lucide-react";

export function PredictiveSandbox({ dataset }: { dataset: any }) {
  // Input parameters
  const [discount, setDiscount] = useState(10); // 0% - 50%
  const [adSpend, setAdSpend] = useState(50); // $0k - $200k
  const [teamSize, setTeamSize] = useState(5); // 1 - 20 heads

  // Generate simulated forecast data over 6 months based on parameters
  const chartData = useMemo(() => {
    const data = [];
    const baseVolume = dataset?.rowCount
      ? Math.min(10000, dataset.rowCount * 5)
      : 5000;
    const baseTicket = 85; // average purchase value

    for (let month = 1; month <= 6; month++) {
      // Math model for business performance simulation
      // Discount increases customer volume but decreases average price ticket
      const priceEffect = 1 - discount / 100;
      const volumeMultiplierFromDiscount = 1 + discount * 0.03; // +3% volume per 1% discount

      // Ad spend increases volume logarithmically (diminishing returns)
      const volumeFromAdSpend = Math.log(1 + adSpend) * 1200;

      // Team size boosts retention and conversion efficiency
      const teamEfficiency = 1 + teamSize * 0.02;

      // Calculations
      const activeCustomers = Math.round(
        (baseVolume * volumeMultiplierFromDiscount + volumeFromAdSpend) *
          teamEfficiency *
          (1 + month * 0.05),
      );
      const grossRevenue = Math.round(
        activeCustomers * baseTicket * priceEffect,
      );

      // Expenses: ad spend + team operations costs + variable cost (20% of rev)
      const operationalCosts =
        adSpend * 1000 + teamSize * 6000 + grossRevenue * 0.22;
      const netProfit = Math.max(0, grossRevenue - operationalCosts);
      const profitMargin =
        grossRevenue > 0
          ? parseFloat(((netProfit / grossRevenue) * 100).toFixed(1))
          : 0;

      data.push({
        name: `Month ${month}`,
        "Active Customers": activeCustomers,
        "Net Revenue ($)": grossRevenue,
        "Net Profit ($)": netProfit,
        "Margin (%)": profitMargin,
      });
    }
    return data;
  }, [discount, adSpend, teamSize, dataset]);

  // Dynamic AI advisor message
  const aiAdvice = useMemo(() => {
    if (discount > 30 && adSpend < 30) {
      return {
        title: "Margin Squeeze Warning",
        text: "You are offering a high discount (over 30%) with minimal advertising. While existing traffic may convert, low price margins combined with low acquisition velocity will lead to capital drag. Consider increasing ad spend or scaling back discounts.",
        status: "border-destructive/30 bg-destructive/5 text-destructive",
      };
    }
    if (adSpend > 120 && teamSize < 4) {
      return {
        title: "Leads Saturated (Bottleneck)",
        text: "Your marketing acquisition budget is highly optimized (over $120k), but your sales operations team size is too small (under 4 heads) to handle the lead capacity. Leads will churn before closing. Increase headcount to capture ROI.",
        status: "border-warning/30 bg-warning/5 text-warning",
      };
    }
    if (discount < 8 && adSpend > 80 && teamSize > 8) {
      return {
        title: "Premium Capture Strategy",
        text: "Low discount margins matching high advertising and robust operation scales. This positions your product as premium. Revenue volume is stable, yielding strong cash flow margins. Maintain this setting to build brand equity.",
        status: "border-success/30 bg-success/5 text-success",
      };
    }
    return {
      title: "Optimal Balanced Performance",
      text: "Current configurations indicate healthy unit economics. Price ticket optimizations are offset by moderate advertising. Sales conversion pipelines are balanced with active personnel sizes. Projected profit yields are secure.",
      status: "border-primary/30 bg-primary/5 text-primary",
    };
  }, [discount, adSpend, teamSize]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Control Sliders Panel ────────────────────────────────── */}
      <div className="card-elevated p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight">
              Scenario controls
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Adjust internal business variables to run real-time math projections
            on your dataset matrix.
          </p>
        </div>

        <div className="space-y-6 py-4 flex-grow">
          {/* Discount slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Percent className="h-3.5 w-3.5 text-primary" /> Price Discount
              </span>
              <span className="text-sm font-mono font-bold text-primary">
                {discount}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={discount}
              onChange={(e) => setDiscount(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
              <span>0% (Premium)</span>
              <span>50% (Liquidation)</span>
            </div>
          </div>

          {/* Ad Spend slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Monthly Ad
                Spend
              </span>
              <span className="text-sm font-mono font-bold text-primary">
                ${adSpend}k
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={adSpend}
              onChange={(e) => setAdSpend(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
              <span>$0 (Organic)</span>
              <span>$200k (Aggressive)</span>
            </div>
          </div>

          {/* Team Size slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" /> Sales Operations
                Size
              </span>
              <span className="text-sm font-mono font-bold text-primary">
                {teamSize} heads
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
              <span>1 head</span>
              <span>20 heads</span>
            </div>
          </div>
        </div>

        {/* Security / execution context info */}
        <div className="rounded-xl border border-white/5 bg-background/40 p-3.5 text-[11px] text-muted-foreground flex items-start gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="leading-relaxed">
            Mathematical parameters are computed client-side using deterministic
            polynomial formulas relative to dataset size.
          </p>
        </div>
      </div>

      {/* ── Forecast Projections Charts ───────────────────────────── */}
      <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
        {/* Dynamic AI advice box */}
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 transition-colors duration-300 ${aiAdvice.status}`}
        >
          <Sparkles className="h-5 w-5 shrink-0 animate-pulse mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-bold tracking-tight">
              {aiAdvice.title}
            </div>
            <p className="text-xs leading-relaxed text-foreground/80">
              {aiAdvice.text}
            </p>
          </div>
        </div>

        {/* Graph display */}
        <div className="card-elevated p-6 flex-grow flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" /> Projected Gross
                Revenue & Profit
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Deterministic 6-month simulation path
              </p>
            </div>
          </div>

          <div className="w-full h-[240px] flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="oklch(0.85 0.19 95)"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.85 0.19 95)"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="oklch(0.80 0.14 195)"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.80 0.14 195)"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(1 0 0 / 5%)"
                />
                <XAxis
                  dataKey="name"
                  stroke="oklch(1 0 0 / 40%)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="oklch(1 0 0 / 40%)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.155 0.022 270 / 92%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "12px",
                    color: "oklch(0.98 0.005 250)",
                  }}
                  itemStyle={{ fontSize: 12 }}
                  labelStyle={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "oklch(0.85 0.19 95)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="Net Revenue ($)"
                  stroke="oklch(0.85 0.19 95)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="Net Profit ($)"
                  stroke="oklch(0.80 0.14 195)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marginal KPIs summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Margin",
              val: `${chartData[5]["Margin (%)"]}%`,
              unit: "Peak month 6",
              color: "text-primary",
            },
            {
              label: "Rev Gain",
              val: `$${(chartData[5]["Net Revenue ($)"] / 1000).toFixed(0)}k`,
              unit: "Month 6 target",
              color: "text-info",
            },
            {
              label: "Active Cust",
              val: chartData[5]["Active Customers"].toLocaleString(),
              unit: "Forecast scale",
              color: "text-success",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-white/5 bg-surface/30 p-3.5 text-center"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
              <div
                className={`text-lg font-bold ${kpi.color} tracking-tight mt-1`}
              >
                {kpi.val}
              </div>
              <span className="text-[9px] text-muted-foreground/60">
                {kpi.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
