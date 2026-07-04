import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import insightforgeLogo from "@/assets/images/insightforge-logo.png";

/* ─────────────────────────────────────────────────────────────
   Logo image helper — enforces crisp rendering rules:
   • No image-rendering override (browser high-quality default)
   • No opacity reduction
   • object-contain preserves aspect ratio, never stretches
   • Explicit width/height prevents layout shift
──────────────────────────────────────────────────────────────── */
function LogoImg({
  src,
  alt,
  displayHeight,
  maxWidth,
  loading = "eager",
}: {
  src: string;
  alt: string;
  displayHeight: number;
  maxWidth: number;
  loading?: "eager" | "lazy";
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={maxWidth}
      height={displayHeight}
      loading={loading}
      decoding="async"
      className="w-auto object-contain"
      style={{ height: displayHeight, maxWidth }}
    />
  );
}

/* ── Premium SVG social icons ──────────────────────────────── */
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/* ── Tech stack data ───────────────────────────────────────── */
const TECH_STACK = [
  {
    name: "Firebase",
    color: "oklch(0.78 0.18 55)",
    glow: "oklch(0.78 0.18 55 / 20%)",
  },
  {
    name: "Python",
    color: "oklch(0.75 0.15 230)",
    glow: "oklch(0.75 0.15 230 / 18%)",
  },
  {
    name: "Pandas",
    color: "oklch(0.70 0.14 250)",
    glow: "oklch(0.70 0.14 250 / 18%)",
  },
  {
    name: "Scikit-learn",
    color: "oklch(0.72 0.18 155)",
    glow: "oklch(0.72 0.18 155 / 18%)",
  },
];

/* ── Social links ──────────────────────────────────────────── */
const SOCIAL_LINKS = [
  {
    label: "Twitter / X",
    href: "https://x.com/cyberminds",
    Icon: TwitterIcon,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/cyberminds",
    Icon: LinkedInIcon,
  },
  {
    label: "GitHub",
    href: "https://github.com/cyberminds",
    Icon: GitHubIcon,
  },
];

/* ── Footer ────────────────────────────────────────────────────── */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="relative mt-auto border-t border-border/30"
      style={{
        background: "oklch(0.135 0.020 270 / 90%)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
      }}
    >
      {/* Top animated gradient glow line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, oklch(0.68 0.22 290 / 50%) 25%, oklch(0.70 0.20 255 / 45%) 50%, oklch(0.68 0.18 310 / 40%) 75%, transparent 100%)",
        }}
      />

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Tech Stack Strip ────────────────────────────────────── */}
      <div className="relative border-b" style={{ borderColor: "oklch(1 0 0 / 5%)" }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-6 py-5">
          <span
            className="mr-2 text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "oklch(0.55 0.01 250)" }}
          >
            Powered by
          </span>
          {TECH_STACK.map((tech, i) => (
            <motion.span
              key={tech.name}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.08, y: -2 }}
              transition={{
                delay: i * 0.07,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="cursor-default select-none rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: `${tech.glow}`,
                border: `1px solid ${tech.color.replace(")", " / 30%)")}`,
                color: tech.color,
                boxShadow: `0 0 12px ${tech.glow}`,
              }}
            >
              {tech.name}
            </motion.span>
          ))}
        </div>
      </div>

      {/* ── Main body ────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-7xl px-6 py-10">
        {/* Three-column layout */}
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
          {/* LEFT — Copyright */}
          <div className="flex items-center justify-center md:justify-start">
            <Link
              to="/"
              aria-label="InsightForge AI home"
              className="group flex-shrink-0 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <LogoImg
                src={insightforgeLogo}
                alt="InsightForge AI"
                displayHeight={44}
                maxWidth={152}
                loading="eager"
              />
            </Link>
          </div>

          {/* CENTER — Made with love */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="font-sans text-[13px] tracking-wide text-muted-foreground/55">
              Made with{" "}
              <span className="text-[#e05252]" role="img" aria-label="love">
                ❤️
              </span>{" "}
              by <span className="font-semibold text-muted-foreground/75">Team CyberMinds</span>
            </p>
            <p className="text-xs text-muted-foreground/40">© {year} InsightForge</p>
          </div>

          {/* RIGHT — Social icons */}
          <div className="flex items-center justify-center gap-3 md:justify-end">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="grid h-9 w-9 place-items-center rounded-xl transition-all duration-200"
                style={{
                  background: "oklch(1 0 0 / 4%)",
                  border: "1px solid oklch(1 0 0 / 7%)",
                  color: "oklch(0.60 0.01 250)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "oklch(0.68 0.22 290 / 10%)";
                  (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.68 0.22 290 / 30%)";
                  (e.currentTarget as HTMLElement).style.color = "oklch(0.82 0.14 290)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)";
                  (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 7%)";
                  (e.currentTarget as HTMLElement).style.color = "oklch(0.60 0.01 250)";
                }}
              >
                <Icon className="h-4 w-4" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
