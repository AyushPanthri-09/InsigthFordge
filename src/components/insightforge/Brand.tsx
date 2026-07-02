import { Link } from "@tanstack/react-router";
import insightforgeLogo from "@/assets/images/insightforge-logo.png";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="InsightForge AI home">
      {compact ? (
        /* Compact: small square in navbar workspace header */
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-xl transition-transform duration-200 group-hover:scale-105">
          <img
            src={insightforgeLogo}
            alt="InsightForge AI"
            width={64}
            height={64}
            loading="eager"
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        /* Full logo — proportional, never stretched */
        <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
          <img
            src={insightforgeLogo}
            alt="InsightForge AI"
            width={140}
            height={52}
            loading="eager"
            decoding="async"
            className="h-9 w-auto max-w-[140px] object-contain"
          />
        </div>
      )}
    </Link>
  );
}