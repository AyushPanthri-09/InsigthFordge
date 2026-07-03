import React from "react";
import { sanitizeReportString, sanitizeReportValue } from "../report-sanitizer";

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  mono?: boolean;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  width?: string | number;
}

interface ReportTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  maxRows?: number;
  className?: string;
  striped?: boolean;
  /** New API: preferred */
  rowTone?: (row: T) => "critical" | "warning" | "success" | undefined;
  /** Back-compat: older prop name */
  getRowTone?: (
    row: T,
  ) => "critical" | "warning" | "success" | "info" | "neutral" | undefined;
}

export function ReportTable<T extends object>({
  columns,
  rows,
  maxRows,
  className = "",
  striped = false,
  rowTone,
  getRowTone,
}: ReportTableProps<T>) {
  const toneFn = rowTone ?? getRowTone;
  const sanitizedRows = rows.map((row) => sanitizeReportValue(row));
  const visible = maxRows ? sanitizedRows.slice(0, maxRows) : sanitizedRows;

  return (
    <div className="rpt-table-wrap">
      <table
        className={`rpt-table ${striped ? "rpt-table-striped" : ""} ${className}`}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  textAlign: col.align ?? "left",
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, ri) => (
            <tr
              key={ri}
              className={
                toneFn ? `rpt-table-row-${toneFn(row) ?? "neutral"}` : undefined
              }
            >
              {columns.map((col) => {
                const cellValue = col.render
                  ? col.render(row)
                  : (row as Record<string, unknown>)[String(col.key)];
                const safeValue =
                  typeof cellValue === "string"
                    ? sanitizeReportString(cellValue)
                    : typeof cellValue === "number" || typeof cellValue === "boolean"
                    ? sanitizeReportString(cellValue)
                    : React.isValidElement(cellValue)
                    ? cellValue
                    : cellValue == null
                    ? ""
                    : sanitizeReportString(String(cellValue));

                return (
                  <td
                    key={String(col.key)}
                    className={col.mono ? "rpt-table-mono" : ""}
                    style={{ textAlign: col.align ?? "left" }}
                  >
                    {safeValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
