/**
 * PDF Renderer — HTML → html2canvas → jsPDF
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the React report tree into a hidden off-screen container,
 * captures each .rpt-page element at 2× resolution, and assembles a
 * multi-page A4 PDF via jsPDF.
 *
 * The old manual jsPDF text-positioning approach is completely replaced.
 */

import { createRoot } from "react-dom/client";
import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { FullAnalysis } from "@/services/analytics/types";
import { buildReportDocument } from "./report-engine/builder";
import { HtmlReportDocument } from "./report-engine/HtmlReportDocument";

// A4 dimensions in points (72 dpi)
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;

// Pixel width of each .rpt-page element (must match CSS)
const PAGE_PX = 794;

async function renderReportToContainer(analysis: FullAnalysis): Promise<HTMLElement> {
  const doc = buildReportDocument(analysis);

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: ${PAGE_PX}px;
    background: transparent;
    z-index: -1;
    pointer-events: none;
  `;
  document.body.appendChild(wrapper);

  await new Promise<void>((resolve) => {
    const root = createRoot(wrapper);
    root.render(React.createElement(HtmlReportDocument, { doc }));
    // Give React + recharts time to paint
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 600)));
  });

  return wrapper;
}

async function capturePages(container: HTMLElement, scale = 2): Promise<HTMLCanvasElement[]> {
  const pages = Array.from(container.querySelectorAll<HTMLElement>(".rpt-page"));
  const canvases: HTMLCanvasElement[] = [];

  for (const page of pages) {
    const canvas = await html2canvas(page, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#0f0e1a",
      logging: false,
      width: PAGE_PX,
      height: page.scrollHeight,
    });
    canvases.push(canvas);
  }

  return canvases;
}

export async function downloadExecutivePdf(analysis: FullAnalysis): Promise<void> {
  const container = await renderReportToContainer(analysis);

  try {
    const canvases = await capturePages(container);

    const pdf = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });

    canvases.forEach((canvas, i) => {
      if (i > 0) pdf.addPage();

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const canvasAspect = canvas.height / canvas.width;
      const imgH = A4_W_PT * canvasAspect;

      if (imgH <= A4_H_PT) {
        // Page fits — centre vertically
        const yOffset = (A4_H_PT - imgH) / 2;
        pdf.addImage(imgData, "JPEG", 0, yOffset, A4_W_PT, imgH);
      } else {
        // Tall page — scale to fit width, allow overflow (rare)
        pdf.addImage(imgData, "JPEG", 0, 0, A4_W_PT, imgH);
      }
    });

    const name = analysis.dataset.fileName.replace(/\.[^.]+$/, "");
    pdf.save(`insightforge-${name}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
