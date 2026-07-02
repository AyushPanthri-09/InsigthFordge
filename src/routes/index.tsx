import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  FileSearch,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Target,
  Lightbulb,
  Activity,
  FileText,
  Upload,
  Zap,
  Database,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Brand } from "@/components/insightforge/Brand";
import { Footer } from "@/components/insightforge/Footer";
import { NavMegaMenu } from "@/components/insightforge/NavMegaMenu";

/* ── Animation presets ──────────────────────────────────────── */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, ease: EASE_OUT, delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: EASE_OUT, delay },
});

/* ── Nav link ───────────────────────────────────────────────── */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group relative text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      {children}
      <span
        className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-primary transition-transform duration-[250ms] ease-out group-hover:scale-x-100"
        aria-hidden="true"
      />
    </a>
  );
}

/* ── Route ──────────────────────────────────────────────────── */
export const Route = createFileRoute("/")(
  {
    head: () => ({
      meta: [
        { title: "InsightForge AI — Autonomous AI Data Scientist & Business Consultant" },
        {
          name: "description",
          content:
            "Drop any CSV or XLSX. InsightForge AI understands the business context, cleans with reasoning, and delivers four levels of evidence-backed insights.",
        },
        { property: "og:title", content: "InsightForge AI — Premium AI Analytics" },
        {
          property: "og:description",
          content:
            "Understand. Clean. Analyze. Predict. Recommend. Every step transparent and evidence-backed.",
        },
      ],
    }),
    component: Landing,
  },
);

function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">

      {/* ── Header ────────────────────────────────────────────── */}
      <header
        className="glass sticky top-0 z-40"
        style={{
          borderBottom: "1px solid oklch(1 0 0 / 7%)",
          boxShadow: "0 1px 40px oklch(0 0 0 / 40%)",
        }}
      >
        {/* Gradient top line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, oklch(0.68 0.22 290 / 45%) 30%, oklch(0.70 0.20 255 / 40%) 70%, transparent 100%)",
          }}
        />

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Brand />

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-8 text-sm md:flex"
            aria-label="Main navigation"
          >
            <NavMegaMenu />
            <NavLink href="#workflow">Workflow</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#why">Live Demo</NavLink>
          </nav>

          {/* Desktop CTA */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className="hidden md:block"
          >
            <Link
              to="/workspace"
              className="btn-glow inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Launch Workspace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Mobile menu toggle */}
          <button
            className="rounded-lg border border-border/50 p-2 text-muted-foreground hover:border-border hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-border/40 px-6 pb-4 md:hidden"
          >
            <nav className="flex flex-col gap-4 pt-4">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#why" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Live Demo</a>
              <Link
                to="/workspace"
                className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Launch Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </nav>
          </motion.div>
        )}
      </header>

      <main>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section
          className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 pt-12 pb-20 text-center"
          aria-label="Hero"
        >
          {/* Animated dot grid */}
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-100" />

          {/* Floating radial orbs */}
          <div className="hero-orb-1 -left-48 top-16" />
          <div className="hero-orb-2 -right-40 top-1/3" />
          <div className="hero-orb-3 bottom-20 left-1/4" />

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-5xl">

            {/* Glowing badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="mb-8 inline-block"
            >
              <span className="hero-badge">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Autonomous AI Data Scientist
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.08 }}
              className="font-display text-5xl font-bold leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-7xl xl:text-8xl"
            >
              Never analyze before{" "}
              <span className="gradient-text">understanding</span>.
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.18 }}
              className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed"
            >
              InsightForge AI reads your dataset the way a senior data scientist would.
              It identifies the business context, justifies every cleaning decision, runs
              four levels of analytics, and delivers evidence-backed recommendations —
              not just statistics.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.28 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/workspace"
                  className="btn-glow inline-flex items-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground"
                >
                  <Upload className="h-4 w-4" />
                  Upload Dataset
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
              <motion.a
                href="#features"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white/[0.04] px-7 py-3.5 text-base font-medium text-foreground backdrop-blur-sm transition-colors hover:border-border/90 hover:bg-white/[0.07]"
              >
                See Live Demo
                <ChevronRight className="h-4 w-4 opacity-60" />
              </motion.a>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
            >
              {[
                { icon: Database, label: "Firebase Storage" },
                { icon: Brain, label: "Explainable AI" },
                { icon: FileText, label: "PDF Reports" },
                { icon: ShieldCheck, label: "Enterprise Ready" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Bottom gradient fade */}
          <div
            className="pointer-events-none absolute bottom-0 inset-x-0 h-32"
            style={{
              background:
                "linear-gradient(to top, var(--color-background) 0%, transparent 100%)",
            }}
          />
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-7xl px-6 pb-28 pt-8">
          <motion.div className="text-center" {...fadeUp()}>
            <p className="section-label mb-3">Capabilities</p>
            <h2 className="font-display text-3xl font-bold tracking-[-0.025em] md:text-4xl">
              Four levels of analytics,{" "}
              <span className="gradient-text">fully explained</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Every insight is tagged with its evidence source and a confidence score.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                whileHover={{ y: -4 }}
                transition={{ delay: i * 0.08, duration: 0.55, ease: EASE_OUT }}
                className="gradient-border-card group cursor-default p-7"
              >
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_currentColor/30] ${c.tone}`}
                >
                  <c.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-base font-semibold tracking-[-0.015em]">{c.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                <div className="mt-5 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Learn more <ChevronRight className="h-3 w-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Workflow ──────────────────────────────────────────── */}
        <section id="workflow" className="relative overflow-hidden py-28">
          {/* Background */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 900px 600px at 50% 50%, oklch(0.68 0.22 290 / 5%), transparent 65%)",
            }}
          />

          <div className="relative mx-auto max-w-7xl px-6">
            <motion.div className="text-center" {...fadeUp()}>
              <p className="section-label mb-3">How it works</p>
              <h2 className="font-display text-3xl font-bold tracking-[-0.025em] md:text-4xl">
                From raw file to{" "}
                <span className="gradient-text">trusted decision</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
                Five stages. Every decision logged. Every conclusion backed by evidence.
              </p>
            </motion.div>

            {/* Desktop: horizontal timeline */}
            <div className="mt-16 hidden md:block">
              <div className="relative">
                {/* Connecting line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="absolute top-7 left-[calc(10%+2rem)] right-[calc(10%+2rem)] h-px origin-left"
                  style={{
                    background:
                      "linear-gradient(to right, oklch(0.68 0.22 290 / 70%), oklch(0.65 0.20 240 / 60%), oklch(0.68 0.22 290 / 50%))",
                  }}
                />

                <div className="grid grid-cols-5 gap-4">
                  {PIPELINE.map((s, i) => (
                    <motion.div
                      key={s.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      whileHover={{ y: -5 }}
                      transition={{ delay: i * 0.12, duration: 0.55, ease: EASE_OUT }}
                      className="gradient-border-card group flex cursor-default flex-col items-center p-6 text-center"
                    >
                      {/* Step number circle */}
                      <div
                        className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl transition-all duration-300 group-hover:scale-110"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.68 0.22 290 / 20%), oklch(0.65 0.20 240 / 15%))",
                          border: "1px solid oklch(0.68 0.22 290 / 30%)",
                          boxShadow: "0 0 20px oklch(0.68 0.22 290 / 15%)",
                        }}
                      >
                        <s.Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary/60">
                        Step {i + 1}
                      </span>
                      <h3 className="mt-3 text-sm font-semibold tracking-[-0.01em]">{s.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="relative mt-12 md:hidden">
              {/* Vertical line */}
              <div
                className="absolute left-6 top-0 bottom-0 w-px"
                style={{
                  background:
                    "linear-gradient(to bottom, oklch(0.68 0.22 290 / 70%), oklch(0.65 0.20 240 / 50%), transparent)",
                }}
              />

              <div className="space-y-6 pl-16">
                {PIPELINE.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: EASE_OUT }}
                    className="gradient-border-card relative p-5"
                  >
                    {/* Circle on line */}
                    <div
                      className="absolute -left-[3.25rem] top-5 grid h-9 w-9 place-items-center rounded-xl"
                      style={{
                        background: "oklch(0.68 0.22 290 / 18%)",
                        border: "1px solid oklch(0.68 0.22 290 / 35%)",
                      }}
                    >
                      <s.Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="section-label">Step {i + 1}</span>
                    <h3 className="mt-1.5 text-sm font-semibold">{s.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Why InsightForge ─────────────────────────────────── */}
        <section id="why" className="mx-auto max-w-7xl px-6 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="card-elevated relative overflow-hidden p-10 md:p-16"
          >
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
            <div
              className="pointer-events-none absolute -top-px inset-x-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, oklch(0.68 0.22 290 / 40%) 50%, transparent 100%)",
              }}
            />

            <div className="relative mx-auto max-w-4xl text-center">
              <p className="section-label mb-4">Why InsightForge</p>
              <h2 className="font-display text-3xl font-bold tracking-[-0.025em] md:text-4xl">
                Built on a single,{" "}
                <span className="gradient-text">uncompromising philosophy</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
                Every feature is designed to ensure AI transparency, business relevance, and evidence-backed confidence.
              </p>

              {/* Feature grid */}
              <div className="mt-12 grid gap-4 text-left md:grid-cols-2 lg:grid-cols-3">
                {WHY_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -3 }}
                    transition={{ delay: 0.08 + i * 0.09, duration: 0.5, ease: EASE_OUT }}
                    className="group flex items-start gap-4 rounded-xl border border-border/40 bg-white/[0.03] px-5 py-4.5 transition-all duration-250 hover:border-primary/25 hover:bg-white/[0.06] hover:shadow-[0_0_20px_oklch(0.68_0.22_290/12%)]"
                  >
                    <div
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${item.tone}`}
                    >
                      <item.Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold tracking-[-0.01em]">{item.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Philosophy list */}
              <div className="mt-10 grid gap-3 text-sm md:grid-cols-2">
                {PHILOSOPHY.map((p, i) => (
                  <motion.div
                    key={p}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.09, duration: 0.45, ease: EASE_OUT }}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-white/[0.025] px-4 py-3.5 text-left transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "oklch(0.68 0.22 290)" }}
                    />
                    <span className="text-foreground/80">{p}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-7xl px-6 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="relative overflow-hidden rounded-3xl p-12 text-center md:p-20"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.20 0.028 270 / 85%) 0%, oklch(0.16 0.022 270 / 90%) 100%)",
              border: "1px solid oklch(1 0 0 / 10%)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              boxShadow: [
                "0 0 0 1px oklch(0.68 0.22 290 / 18%)",
                "0 4px 6px -1px oklch(0 0 0 / 30%)",
                "0 32px 80px -20px oklch(0 0 0 / 60%)",
                "0 0 120px -40px oklch(0.68 0.22 290 / 20%)",
              ].join(", "),
            }}
          >
            {/* Background glow orbs */}
            <div
              className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full opacity-60"
              style={{
                background: "radial-gradient(circle, oklch(0.68 0.22 290 / 20%) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full opacity-60"
              style={{
                background: "radial-gradient(circle, oklch(0.65 0.20 240 / 18%) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            {/* Top glow line */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, oklch(0.68 0.22 290 / 60%) 30%, oklch(0.70 0.20 255 / 55%) 70%, transparent 100%)",
              }}
            />

            <div className="relative">
              <p className="section-label mb-5">Get started for free</p>
              <h2 className="font-display text-3xl font-bold tracking-[-0.025em] md:text-5xl">
                Start your first{" "}
                <span className="gradient-text">AI Analysis</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground">
                Upload any dataset and let InsightForge AI transform raw data into
                evidence-backed business intelligence in minutes.
              </p>

              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="mt-10 inline-block"
              >
                <Link
                  to="/workspace"
                  className="btn-glow inline-flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground tracking-[-0.01em]"
                >
                  <Upload className="h-5 w-5" />
                  Upload Dataset — It's Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground/60">
                <span>✓ No account required</span>
                <span>✓ Results in seconds</span>
                <span>✓ Enterprise-grade security</span>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────────── */

const PIPELINE = [
  {
    title: "Upload",
    desc: "Drop CSV, Excel or JSON. Firebase stores it securely.",
    Icon: Upload,
  },
  {
    title: "AI Understanding",
    desc: "Domain detection, column semantics, KPIs and relationships.",
    Icon: FileSearch,
  },
  {
    title: "Reasoning",
    desc: "Reasoning-justified cleaning with confidence and business impact.",
    Icon: Brain,
  },
  {
    title: "Visualization",
    desc: "Stats, distributions, correlations, and auto-selected charts.",
    Icon: BarChart3,
  },
  {
    title: "Report Generation",
    desc: "Executive PDF with reasoning logs and prioritized recommendations.",
    Icon: FileText,
  },
];

const CAPABILITIES = [
  {
    title: "Descriptive Analytics",
    desc: "What happened — KPIs, trends, and patterns derived directly from the dataset.",
    Icon: Activity,
    tone: "bg-info/15 text-info",
  },
  {
    title: "Diagnostic Reasoning",
    desc: "Why it happened — multiple hypotheses tested against evidence, ranked by confidence.",
    Icon: Brain,
    tone: "bg-primary/15 text-primary",
  },
  {
    title: "Predictive Forecasts",
    desc: "What will happen — only when supported by the data, with assumptions spelled out.",
    Icon: Lightbulb,
    tone: "bg-warning/15 text-warning",
  },
  {
    title: "Prescriptive Recommendations",
    desc: "What to do — prioritized actions tied to evidence and expected business impact.",
    Icon: Target,
    tone: "bg-success/15 text-success",
  },
  {
    title: "Analyst Notes",
    desc: "Optional human guidance: focus on retention, ignore cancelled orders. Never mandatory.",
    Icon: Sparkles,
    tone: "bg-accent/15 text-accent",
  },
  {
    title: "Evidence Panels",
    desc: "Every claim tagged: Dataset Evidence, External Context, Business Inference.",
    Icon: ShieldCheck,
    tone: "bg-success/15 text-success",
  },
];

const WHY_ITEMS = [
  {
    Icon: Brain,
    title: "Explainable AI",
    desc: "Every decision is reasoned and transparent — no black boxes.",
    tone: "bg-primary/15 text-primary",
  },
  {
    Icon: TrendingUp,
    title: "Business Intelligence",
    desc: "Understands your domain and speaks the language of your business.",
    tone: "bg-info/15 text-info",
  },
  {
    Icon: Target,
    title: "Evidence-backed Recommendations",
    desc: "Actions are prioritized by evidence strength and business impact.",
    tone: "bg-warning/15 text-warning",
  },
  {
    Icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "Firebase-powered encrypted storage with enterprise-grade protection.",
    tone: "bg-success/15 text-success",
  },
  {
    Icon: Zap,
    title: "High Performance",
    desc: "Results in seconds — not hours. Optimized AI pipeline end-to-end.",
    tone: "bg-accent/15 text-accent",
  },
];

const PHILOSOPHY = [
  "Never analyze before understanding.",
  "Never conclude without evidence.",
  "Never predict without assumptions.",
  "Never recommend without justification.",
];