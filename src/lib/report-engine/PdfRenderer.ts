import type { FullAnalysis } from "@/services/analytics/types";
import {
  createPrintableReportHtml,
  downloadExecutivePdf,
  renderExecutivePdf,
} from "./render";

export class PdfRenderer {
  static createHtml(analysis: FullAnalysis): Promise<string> {
    return createPrintableReportHtml(analysis);
  }

  static render(analysis: FullAnalysis) {
    return renderExecutivePdf(analysis);
  }

  static download(analysis: FullAnalysis): Promise<void> {
    return downloadExecutivePdf(analysis);
  }
}

export { createPrintableReportHtml, downloadExecutivePdf, renderExecutivePdf };
