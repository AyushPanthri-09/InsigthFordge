import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload, CloudUpload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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

  const handle = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      onFile(f);
    },
    [onFile],
  );

  return (
    <motion.label
      role="button"
      aria-label="Upload dataset file"
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDragEnd={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return;
        handle(e.dataTransfer.files?.[0]);
      }}
      animate={{
        scale: drag ? 1.012 : 1,
        borderColor: drag
          ? "oklch(0.68 0.22 290 / 70%)"
          : "oklch(1 0 0 / 12%)",
      }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-12 text-center",
        drag
          ? "bg-primary/8 glow-pulse"
          : "border-border/50 bg-background/30 transition-colors hover:border-primary/40 hover:bg-primary/5",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handle(e.target.files?.[0] ?? undefined)}
      />

      {/* Icon — swaps between Upload and CloudUpload */}
      <motion.div
        animate={{
          scale: drag ? 1.15 : 1,
          backgroundColor: drag
            ? "oklch(0.68 0.22 290)"
            : "oklch(0.68 0.22 290 / 12%)",
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="grid h-16 w-16 place-items-center rounded-2xl"
      >
        <AnimatePresence mode="wait" initial={false}>
          {drag ? (
            <motion.div
              key="cloud"
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
            >
              <CloudUpload className="h-7 w-7 text-primary-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Upload className="h-6 w-6 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Text */}
      <div>
        <AnimatePresence mode="wait" initial={false}>
          {drag ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div className="text-base font-semibold text-primary">Release to upload</div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your file will start processing immediately
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div className="text-base font-semibold">Drop your dataset to begin</div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Drag & drop or{" "}
                <span className="font-medium text-primary underline underline-offset-2">
                  click to browse
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Format badge */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5 opacity-70" />
        <span className="font-mono">.csv .tsv .xlsx .xls</span>
      </div>
    </motion.label>
  );
}