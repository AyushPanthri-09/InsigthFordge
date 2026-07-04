import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  BarChart3,
  Upload,
  Terminal,
  Activity,
  Database,
  Users,
  Clock,
  LogOut,
  ShieldCheck,
  ChevronRight,
  History,
  FileSpreadsheet,
} from "lucide-react";
import { Brand } from "@/components/insightforge/Brand";
import { authService, type UserProfile } from "@/services/auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const DUMMY_AUDIT_LOGS = [
  { action: "User session authenticated", time: "Just now", user: "You" },
  {
    action: "Database initialized (SQLite)",
    time: "5 mins ago",
    user: "System",
  },
  {
    action: "Collaborator seat assigned: FullStacker",
    time: "10 mins ago",
    user: "AyushPanthri",
  },
  {
    action: "Backend repository sync complete",
    time: "30 mins ago",
    user: "Teammate",
  },
  {
    action: "FastAPI endpoints mapped: /analyze",
    time: "1 hour ago",
    user: "Teammate",
  },
  {
    action: "Role permissions verification passed",
    time: "2 hours ago",
    user: "Security",
  },
];

function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error("Access Denied", {
        description: "Please authenticate to access the dashboard.",
      });
      router.navigate({ to: "/login" });
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const handleLogout = async () => {
    await authService.logout();
    router.navigate({ to: "/login" });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Toaster richColors closeButton position="top-center" />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Brand />

          <div className="flex items-center gap-4">
            {/* User credentials badge */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>{user.email}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-10 w-full flex-grow space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-primary/15 via-info/5 to-transparent p-8 relative overflow-hidden">
          {/* Neon accent blobs */}
          <div className="absolute right-0 top-0 h-40 w-40 bg-primary/20 rounded-full blur-[80px]" />
          <div className="relative z-10 space-y-3 max-w-2xl">
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Hello, <span className="gradient-text">{user.role}</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
              Welcome to the **InsightForge AI Platform**. The analytical workspace is fully
              operational. You have access permissions to upload datasets, analyze quality issues,
              customize scenario forecasting modules, and run explainable AI queries.
            </p>
            <div className="pt-2">
              <Link
                to="/workspace"
                className="btn-glow inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-95"
                style={{
                  boxShadow: "0 4px 20px -4px oklch(0.85 0.19 95 / 45%)",
                }}
              >
                <Upload className="h-4 w-4" /> Launch Analytics Workspace{" "}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* System telemetry grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Server Health",
              value: "ONLINE",
              icon: Activity,
              detail: "Pulsing green logic",
              color: "text-success",
            },
            {
              label: "Database Engine",
              value: "SQLite (Dev)",
              icon: Database,
              detail: "Local workspace DB",
              color: "text-primary",
            },
            {
              label: "API Latency",
              value: "14 ms",
              icon: Clock,
              detail: "Secure backend routing",
              color: "text-info",
            },
            {
              label: "Seat Occupancy",
              value: "4 Seats Active",
              icon: Users,
              detail: "Team collaborator limit",
              color: "text-warning",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-white/5 bg-surface/40 p-5 space-y-4 hover:border-white/10 hover:bg-white/[0.03] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <div className="p-2 rounded-xl bg-white/5 border border-white/8">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${stat.color} tracking-tight`}>
                  {stat.value === "ONLINE" && (
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-success animate-ping" />
                  )}
                  {stat.value}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{stat.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* File Quick Upload */}
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-surface/20 p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold tracking-tight">Active Datasets</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Quickly parse a new dataset. Staged files are processed under sandbox security
                rules.
              </p>
            </div>

            <div className="rounded-xl border-2 border-dashed border-white/8 bg-background/30 p-8 text-center flex flex-col items-center justify-center gap-3">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-semibold">Ready to launch workflow</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Launch the workspace to upload datasets and generate four levels of evidence-backed
                reports.
              </p>
              <Link
                to="/workspace"
                className="mt-2 text-xs font-semibold text-primary border border-primary/20 bg-primary/5 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                Go to Workspace
              </Link>
            </div>
          </div>

          {/* Audit Logs Console */}
          <div className="rounded-2xl border border-white/5 bg-surface/30 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-warning" />
                <h2 className="font-display text-lg font-bold tracking-tight">Audit Console</h2>
              </div>
              <History className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-4 max-h-[240px] overflow-y-auto scrollbar-thin pr-1">
              {DUMMY_AUDIT_LOGS.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 border-l-2 border-white/5 pl-3 py-0.5 hover:border-primary/45 transition-colors"
                >
                  <div className="flex-grow space-y-1">
                    <p className="text-xs font-semibold leading-relaxed text-foreground/90">
                      {log.action}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium text-warning">{log.user}</span>
                      <span>•</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-6 px-6 text-center text-xs text-muted-foreground">
        <p>© 2026 InsightForge AI Corp. Platform licensed to Seat #{user.id.slice(0, 8)}.</p>
      </footer>
    </div>
  );
}
