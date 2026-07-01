import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

export function AnalystNotesPanel({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Analyst Notes</h3>
          <p className="text-[11px] text-muted-foreground">Optional guidance for the AI — never mandatory.</p>
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={5}
        placeholder={`e.g. "Rows 1–7 are metadata", "Ignore cancelled orders", "Forecast only sales", "Treat negative profit as a real loss", "Focus on customer retention"`}
        className="mt-3 resize-none bg-background/60 text-sm"
      />
    </div>
  );
}