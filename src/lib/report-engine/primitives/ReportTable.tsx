import React from "react";

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
}

export function ReportTable<T extends object>({
  columns,
  rows,
  maxRows,
  className = "",
}: ReportTableProps<T>) {
  const visible = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <div className="rpt-table-wrap">
      <table className={`rpt-table ${className}`}>
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
            <tr key={ri}>
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={col.mono ? "rpt-table-mono" : ""}
                  style={{ textAlign: col.align ?? "left" }}
                >
                  {col.render
                    ? col.render(row)
                    : String(
                        (row as Record<string, unknown>)[String(col.key)] ?? "",
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
