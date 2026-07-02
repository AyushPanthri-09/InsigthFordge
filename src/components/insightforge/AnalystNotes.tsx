import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

const MAX_CHARS = 1000;

export function AnalystNotesPanel({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const remaining = MAX_CHARS - value.length;
  const nearLimit = remaining < 100;

  return (
    <div className="card-elevated p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Analyst Notes</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Optional context for the AI — e.g. rows to ignore, focus areas.
          </p>
        </div>
      </div>

      {/* Textarea */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
        disabled={disabled}
        rows={5}
        placeholder={`e.g. "Rows 1–7 are metadata", "Ignore cancelled orders", "Forecast only sales", "Focus on customer retention"`}
        className="mt-4 resize-none bg-background/60 text-sm transition-colors placeholder:text-muted-foreground/50"
        aria-label="Optional analyst notes for the AI"
      />

      {/* Footer: char count */}
      <div className="mt-1.5 flex justify-end">
        <span
          className={`font-mono text-[10px] tabular-nums ${
            nearLimit ? "text-warning" : "text-muted-foreground/50"
          }`}
        >
          {remaining.toLocaleString()} remaining
        </span>
      </div>
    </div>
  );
}
