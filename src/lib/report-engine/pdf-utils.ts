export interface GeneratedPdf {
  base64: string;
  fileName: string;
  renderer: "playwright" | "puppeteer" | "browser-print";
}

export function sanitizePdfName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "report";
  return `insightforge-${base
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")}.pdf`;
}

export function downloadBase64Pdf(pdf: GeneratedPdf): void {
  const binary = atob(pdf.base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdf.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function waitForReportPaint(
  container: HTMLElement,
): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(resolve, 800)),
    );
  });

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const charts = Array.from(
    container.querySelectorAll(".recharts-wrapper svg"),
  );
  if (charts.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export function openBrowserPrintFallback(html: string): void {
  const printWindow = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=1200,height=900",
  );
  if (!printWindow) {
    throw new Error(
      "Unable to open browser print fallback. Please allow popups for this site.",
    );
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 500);
}
