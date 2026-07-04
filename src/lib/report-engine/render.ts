import React from "react";
import { createRoot } from "react-dom/client";
import type { FullAnalysis } from "@/services/analytics/types";
import { buildReportDocument } from "./builder";
import { HtmlReportDocument } from "./HtmlReportDocument";
import reportTokens from "./report-tokens.css?raw";
import aaTheme from "./aa-theme.css?raw";
import printCss from "./print.css?raw";
import { renderReportPdfServer } from "./playwright";
import {
  downloadBase64Pdf,
  openBrowserPrintFallback,
  sanitizePdfName,
  waitForReportPaint,
  type GeneratedPdf,
} from "./pdf-utils";

const PAGE_PX = 794;

async function renderReportDom(
  analysis: FullAnalysis,
): Promise<{ wrapper: HTMLElement; cleanup: () => void }> {
  const doc = buildReportDocument(analysis);
  const wrapper = document.createElement("div");

  wrapper.style.cssText = [
    "position: fixed",
    "top: -100000px",
    "left: -100000px",
    `width: ${PAGE_PX}px`,
    "background: transparent",
    "z-index: -1",
    "pointer-events: none",
  ].join(";");

  document.body.appendChild(wrapper);
  const root = createRoot(wrapper);
  root.render(React.createElement(HtmlReportDocument, { doc }));

  // Wait for initial paint
  await waitForReportPaint(wrapper);

  // Wait for Recharts SVGs to render
  await new Promise<void>((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      const svgs = wrapper.querySelectorAll(".recharts-surface");
      const hasCharts = svgs.length > 0;
      const hasPlaceholders = wrapper.innerHTML.includes("image[[");

      if ((hasCharts && !hasPlaceholders) || attempts > maxAttempts) {
        clearInterval(interval);
        resolve();
      }
      attempts++;
    }, 100);
  });

  // ✅ ONLY remove specific placeholder patterns, NOT ALL HTML tags
  let html = wrapper.innerHTML;

  // Remove image[[...]] placeholders (any numbers inside)
  html = html.replace(/image\[\[[^\]]*\]\]/g, "");

  // Remove [object Object] artifacts
  html = html.replace(/\[object Object\]/g, "");

  wrapper.innerHTML = html;

  return {
    wrapper,
    cleanup: () => {
      root.unmount();
      wrapper.remove();
    },
  };
}
function buildPrintHtml(reportMarkup: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<title>InsightForge Executive Report</title>",
    `<style>${reportTokens}</style>`,
    `<style>${aaTheme}</style>`,
    `<style>${printCss}</style>`,
    "</head>",
    "<body>",
    `<main id="print-root">${reportMarkup}</main>`,
    "</body>",
    "</html>",
  ].join("");
}

export async function createPrintableReportHtml(
  analysis: FullAnalysis,
): Promise<string> {
  const rendered = await renderReportDom(analysis);

  try {
    // Get the HTML
    let html = rendered.wrapper.innerHTML;

    // FINAL SANITIZATION PASS — removes any remaining placeholder artifacts
    html = html.replace(/image\[\[[^\]]*\]\]/g, "");
    html = html.replace(/\[object Object\]/g, "");

    // ✅ DEBUG: Check if image[[ still exists after sanitization
    if (html.includes("image[[")) {
      console.log("🚨 WARNING: image[[ STILL PRESENT after sanitization!");
      const match = html.match(/image\[\[[^\]]*\]\]/);
      console.log("Example:", match?.[0]);
    } else {
      console.log("✅ image[[ successfully removed from HTML.");
    }

    return buildPrintHtml(html);
  } finally {
    rendered.cleanup();
  }
}

export async function renderExecutivePdf(
  analysis: FullAnalysis,
): Promise<GeneratedPdf> {
  const html = await createPrintableReportHtml(analysis);
  const sourceFileName = analysis.dataset.fileName;

  try {
    return await renderReportPdfServer({ data: { html, sourceFileName } });
  } catch (error) {
    console.warn(
      "Chromium PDF generation failed; falling back to browser print.",
      error,
    );
    openBrowserPrintFallback(html);
    return {
      base64: "",
      fileName: sanitizePdfName(sourceFileName),
      renderer: "browser-print",
    };
  }
}

export async function downloadExecutivePdf(
  analysis: FullAnalysis,
): Promise<void> {
  const pdf = await renderExecutivePdf(analysis);
  if (pdf.renderer !== "browser-print") {
    downloadBase64Pdf(pdf);
  }
}
