import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedDataset } from "../types";

export interface InternalDataset extends ParsedDataset {
  rows: Record<string, unknown>[];
}

export async function parseFile(file: File): Promise<InternalDataset> {
  const ext = file.name.toLowerCase().split(".").pop();
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];

  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const text = await file.text();
    const res = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: true,
      delimiter: ext === "tsv" ? "\t" : undefined,
    });
    rows = res.data.filter((r) => r && Object.keys(r).length);
    columns = res.meta.fields ?? Object.keys(rows[0] ?? {});
  } else if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    columns = rows.length ? Object.keys(rows[0]) : [];
  } else {
    throw new Error(`Unsupported file type: .${ext}. Use CSV or XLSX.`);
  }

  const datasetId = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    fileName: file.name,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    preview: rows.slice(0, 1000),
    rows,
    datasetId,
  };
}
