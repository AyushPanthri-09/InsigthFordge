import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.xls";

export function UploadDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = useCallback((f: File | undefined) => {
    if (!f) return;
    onFile(f);
  }, [onFile]);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return;
        handle(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition",
        drag ? "border-primary bg-primary/5 ai-glow" : "border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handle(e.target.files?.[0] ?? undefined)}
      />
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent ai-glow">
        <Upload className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div className="text-base font-semibold">Drop your dataset to begin</div>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV, TSV, or XLSX · processed entirely in your session
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span className="font-mono">.csv .tsv .xlsx .xls</span>
      </div>
    </label>
  );
}