import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  BarChart3,
  FileText,
  LayoutDashboard,
  FileOutput,
  Zap,
  Sparkles,
  Bot,
  ShieldCheck,
} from "lucide-react";

/* ── Feature data ────────────────────────────────────────────── */
const LEFT_ITEMS = [
  {
    emoji: "📊",
    Icon: BarChart3,
    title: "AI Dataset Analysis",
    desc: "Advanced preprocessing for CSV, Excel and JSON.",
    color: "bg-primary/12 text-primary",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.68_0.22_290/30%),0_8px_28px_-8px_oklch(0.68_0.22_290/30%)]",
    activeBorder: "hover:border-primary/35",
  },
  {
    emoji: "📄",
    Icon: FileText,
    title: "PDF Intelligence",
    desc: "Understand documents instead of simply extracting text.",
    color: "bg-info/12 text-info",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.7_0.16_230/30%),0_8px_28px_-8px_oklch(0.7_0.16_230/30%)]",
    activeBorder: "hover:border-info/35",
  },
  {
    emoji: "📈",
    Icon: LayoutDashboard,
    title: "Interactive Dashboards",
    desc: "Beautiful charts and analytics.",
    color: "bg-accent/12 text-accent",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.68_0.18_250/30%),0_8px_28px_-8px_oklch(0.68_0.18_250/30%)]",
    activeBorder: "hover:border-accent/35",
  },
  {
    emoji: "📑",
    Icon: FileOutput,
    title: "Executive Reports",
    desc: "Generate professional downloadable reports.",
    color: "bg-success/12 text-success",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.72_0.18_155/30%),0_8px_28px_-8px_oklch(0.72_0.18_155/30%)]",
    activeBorder: "hover:border-success/35",
  },
] as const;

const RIGHT_ITEMS = [
  {
    emoji: "⚡",
    Icon: Zap,
    title: "AI Reasoning",
    desc: "Transparent explainable AI.",
    color: "bg-warning/12 text-warning",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.78_0.17_75/30%),0_8px_28px_-8px_oklch(0.78_0.17_75/30%)]",
    activeBorder: "hover:border-warning/35",
  },
  {
    emoji: "🧹",
    Icon: Sparkles,
    title: "Smart Cleaning",
    desc: "Automatic preprocessing pipeline.",
    color: "bg-primary/12 text-primary",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.68_0.22_290/30%),0_8px_28px_-8px_oklch(0.68_0.22_290/30%)]",
    activeBorder: "hover:border-primary/35",
  },
  {
    emoji: "🤖",
    Icon: Bot,
    title: "Recommendations",
    desc: "Evidence-backed business suggestions.",
    color: "bg-accent/12 text-accent",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.68_0.18_250/30%),0_8px_28px_-8px_oklch(0.68_0.18_250/30%)]",
    activeBorder: "hover:border-accent/35",
  },
  {
    emoji: "🛡",
    Icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "Encrypted storage with Firebase.",
    color: "bg-success/12 text-success",
    glow: "hover:shadow-[0_0_0_1px_oklch(0.72_0.18_155/30%),0_8px_28px_-8px_oklch(0.72_0.18_155/30%)]",
    activeBorder: "hover:border-success/35",
  },
] as const;

type FeatureItem = (typeof LEFT_ITEMS)[number] | (typeof RIGHT_ITEMS)[number];

/* ── Feature card ─────────────────────────────────────────────── */
function FeatureCard({ emoji, Icon, title, desc, color, glow, activeBorder }: FeatureItem) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "group flex cursor-default items-start gap-3.5 rounded-xl border border-border/30",
        "bg-white/[0.025] p-4",
        "transition-[border-color,background-color,box-shadow] duration-200",
        "hover:bg-white/[0.05]",
        activeBorder,
        glow,
      ].join(" ")}
    >
      {/* Icon badge */}
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${color}`}
        aria-hidden="true"
      >
        <span className="text-sm leading-none">{emoji}</span>
      </div>
      {/* Text */}
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-snug tracking-[-0.01em]">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Main NavMegaMenu component ───────────────────────────────── */
export function NavMegaMenu() {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* ── Trigger ──────────────────────────────────────────── */}
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className="group relative flex items-center gap-0.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        Features
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown className="h-3.5 w-3.5 opacity-55" />
        </motion.div>
        {/* Animated underline */}
        <span
          className={[
            "absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left rounded-full bg-primary",
            "transition-transform duration-[250ms] ease-out",
            open ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {/* ── Dropdown panel ────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={show}
            onMouseLeave={hide}
            className="absolute left-1/2 top-[calc(100%+18px)] z-50 w-[720px] -translate-x-1/2"
            role="region"
            aria-label="Features menu"
          >
            {/* Connector arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
              <div
                className="h-3 w-3 rotate-45 border-l border-t"
                style={{
                  background: "oklch(0.175 0.024 270)",
                  borderColor: "oklch(1 0 0 / 10%)",
                }}
              />
            </div>

            {/* Panel */}
            <div
              style={{
                background: "oklch(0.155 0.022 270 / 92%)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: 18,
                boxShadow: [
                  "0 0 0 1px oklch(0.68 0.22 290 / 16%)",
                  "0 4px 6px -1px oklch(0 0 0 / 35%)",
                  "0 28px 70px -12px oklch(0 0 0 / 75%)",
                  "0 0 100px -30px oklch(0.68 0.22 290 / 14%)",
                ].join(", "),
              }}
            >
              {/* Panel header */}
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="section-label mb-1">Platform capabilities</div>
                <p className="text-sm font-semibold tracking-[-0.01em]">
                  Everything you need for AI-powered analytics
                </p>
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-2 gap-2 p-4">
                <div className="space-y-2">
                  {LEFT_ITEMS.map((item) => (
                    <FeatureCard key={item.title} {...item} />
                  ))}
                </div>
                <div className="space-y-2">
                  {RIGHT_ITEMS.map((item) => (
                    <FeatureCard key={item.title} {...item} />
                  ))}
                </div>
              </div>

              {/* Panel footer */}
              <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3.5">
                <span className="text-[11px] text-muted-foreground/50">
                  AI-powered · Evidence-backed · Explainable
                </span>
                <Link
                  to="/workspace"
                  className="group inline-flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                  onClick={() => setOpen(false)}
                >
                  Start analyzing
                  <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
