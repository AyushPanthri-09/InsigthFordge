import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent ai-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight">
            Insight<span className="gradient-text">Forge</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            AI Data Scientist
          </span>
        </div>
      )}
    </Link>
  );
}