import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sanitizePdfName, type GeneratedPdf } from "./pdf-utils";

type ChromiumLike = {
  launch: (options: Record<string, unknown>) => Promise<{
    newPage: (options?: Record<string, unknown>) => Promise<{
      setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
      emulateMedia: (options: { media: "print" | "screen" }) => Promise<void>;
      pdf: (options: Record<string, unknown>) => Promise<Uint8Array | Buffer>;
    }>;
    close: () => Promise<void>;
  }>;
};

const PdfRenderInput = z.object({
  html: z.string().min(1),
  sourceFileName: z.string().min(1),
});

async function importOptionalModule<T>(name: string): Promise<T | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<T>;
    return await dynamicImport(name);
  } catch {
    return null;
  }
}

async function getChromiumRenderer(): Promise<{
  chromium: ChromiumLike;
  renderer: "playwright" | "puppeteer";
}> {
  const playwright = await importOptionalModule<{ chromium?: ChromiumLike }>("playwright");
  if (playwright?.chromium) {
    return { chromium: playwright.chromium, renderer: "playwright" };
  }

  const puppeteer = await importOptionalModule<{
    default?: { launch: ChromiumLike["launch"] };
    launch?: ChromiumLike["launch"];
  }>("puppeteer");
  const launcher = puppeteer?.default?.launch ?? puppeteer?.launch;
  if (launcher) {
    return {
      chromium: {
        launch: launcher,
      },
      renderer: "puppeteer",
    };
  }

  throw new Error("Install Playwright or Puppeteer to enable native Chromium PDF export.");
}

export async function renderPdfWithChromium(
  html: string,
  sourceFileName: string,
): Promise<GeneratedPdf> {
  const { chromium, renderer } = await getChromiumRenderer();
  const browser = await chromium.launch({
    headless: true,
    args: ["--font-render-hinting=none", "--disable-dev-shm-usage", "--no-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1240, height: 1754, deviceScaleFactor: 2 },
    });

    await page.setContent(html, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.emulateMedia({ media: "print" });

    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      scale: 1,
      tagged: true,
    });

    return {
      base64: Buffer.from(bytes).toString("base64"),
      fileName: sanitizePdfName(sourceFileName),
      renderer,
    };
  } finally {
    await browser.close();
  }
}

export const renderReportPdfServer = createServerFn({ method: "POST" })
  .validator((input: unknown) => PdfRenderInput.parse(input))
  .handler(async ({ data }) => renderPdfWithChromium(data.html, data.sourceFileName));
