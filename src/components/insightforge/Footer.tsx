import { Link } from "@tanstack/react-router";
import insightforgeLogo from "@/assets/images/insightforge-logo.png";
import cybermindsLogo from "@/assets/images/cyberminds-logo.png";

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

/* ── Marquee items ─────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  { logo: insightforgeLogo, alt: "InsightForge AI", text: "InsightForge" },
  { logo: cybermindsLogo,   alt: "Team CyberMinds", text: "Team CyberMinds" },
  { logo: insightforgeLogo, alt: "InsightForge AI", text: "InsightForge" },
  { logo: cybermindsLogo,   alt: "Team CyberMinds", text: "Team CyberMinds" },
  { logo: insightforgeLogo, alt: "InsightForge AI", text: "InsightForge" },
  { logo: cybermindsLogo,   alt: "Team CyberMinds", text: "Team CyberMinds" },
  // Second set — seamless loop
  { logo: insightforgeLogo, alt: "InsightForge AI", text: "InsightForge" },
  { logo: cybermindsLogo,   alt: "Team CyberMinds", text: "Team CyberMinds" },
  { logo: insightforgeLogo, alt: "InsightForge AI", text: "InsightForge" },
  { logo: cybermindsLogo,   alt: "Team CyberMinds", text: "Team CyberMinds" },
  { logo: insightforgeLogo, alt: "InsightForge AI", text: "InsightForge" },
  { logo: cybermindsLogo,   alt: "Team CyberMinds", text: "Team CyberMinds" },
];

function MarqueeItem({ logo, alt, text }: { logo: string; alt: string; text: string }) {
  return (
    <span className="mx-8 inline-flex shrink-0 items-center gap-3">
      <LogoImg
        src={logo}
        alt={alt}
        displayHeight={32}
        maxWidth={32}
        loading="lazy"
      />
      <span className="text-sm font-semibold text-muted-foreground/60 tracking-[-0.01em]">{text}</span>
      <span className="mx-2 text-primary/30 text-lg">•</span>
    </span>
  );
}

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

      {/* ── Main body ────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-7xl px-6 py-12">

        {/* Three-column layout */}
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between">

          {/* LEFT — InsightForge logo */}
          <Link
            to="/"
            aria-label="InsightForge AI home"
            className="group flex-shrink-0 rounded-xl transition-all duration-300 hover:scale-105
              hover:shadow-[0_0_28px_oklch(0.68_0.22_290_/_30%)]"
          >
            <LogoImg
              src={insightforgeLogo}
              alt="InsightForge AI"
              displayHeight={52}
              maxWidth={172}
              loading="eager"
            />
          </Link>

          {/* CENTER — tagline + copyright + made with */}
          <div className="flex flex-col items-center gap-2 text-center">
            <p
              className="text-base font-semibold tracking-[-0.01em]"
              style={{ color: "oklch(0.80 0.08 270)" }}
            >
              Evidence-driven AI Analytics
            </p>
            <p className="text-xs text-muted-foreground/50">
              © {year} InsightForge
            </p>
            <p className="mt-1 font-sans text-[13px] tracking-wide text-muted-foreground/55">
              Made with{" "}
              <span className="text-[#e05252]" role="img" aria-label="love">
                ❤️
              </span>{" "}
              by{" "}
              <span className="font-semibold text-muted-foreground/75">Team CyberMinds</span>
            </p>
          </div>

          {/* RIGHT — CyberMinds logo */}
          <a
            href="https://cyberminds.dev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Team CyberMinds"
            className="group flex-shrink-0 rounded-xl transition-all duration-300 hover:scale-105
              hover:shadow-[0_0_28px_oklch(0.58_0.22_240_/_30%)]"
          >
            <LogoImg
              src={cybermindsLogo}
              alt="Team CyberMinds"
              displayHeight={52}
              maxWidth={172}
              loading="eager"
            />
          </a>
        </div>
      </div>

      {/* ── Marquee strip ──────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-t py-4"
        style={{
          borderColor: "oklch(1 0 0 / 6%)",
          background: "oklch(0.115 0.018 270 / 70%)",
        }}
      >
        {/* Edge fade masks */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28"
          style={{ background: "linear-gradient(to right, oklch(0.115 0.018 270), transparent)" }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28"
          style={{ background: "linear-gradient(to left, oklch(0.115 0.018 270), transparent)" }}
        />

        {/* Scrolling track — two copies for seamless loop */}
        <div className="group flex w-max">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center group-hover:[animation-play-state:paused]"
              style={{ animation: "marquee-rtl 30s linear infinite" }}
              aria-hidden={copy === 1 ? "true" : undefined}
            >
              {MARQUEE_ITEMS.map((item, i) => (
                <MarqueeItem key={`${copy}-${i}`} {...item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
