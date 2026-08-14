import { Copy, Download } from "lucide-react";

interface ResultGridProps {
  canExecute: boolean;
  hasMore: boolean;
  isExecuting: boolean;
  rows: Record<string, unknown>[];
  onExecute: () => void;
  onLoadMore: () => void;
}

export function ResultGrid({
  canExecute,
  hasMore,
  isExecuting,
  rows,
  onExecute,
  onLoadMore,
}: ResultGridProps) {
  const columns = getResultColumns(rows);

  return (
    <section className="panel side-panel results-panel" aria-label="Results">
      <div className="panel-heading">
        <h2>Results</h2>
        <div className="button-row">
          <button
            type="button"
            title="Run"
            disabled={!canExecute || isExecuting}
            onClick={onExecute}
          >
            {isExecuting ? "Running" : "Run"}
          </button>
          {hasMore ? (
            <button type="button" disabled={isExecuting} onClick={onLoadMore}>
              {isExecuting ? "Loading" : "Load more"}
            </button>
          ) : null}
          <button
            className="icon-button"
            type="button"
            title="Copy JSON"
            onClick={() =>
              navigator.clipboard.writeText(JSON.stringify(rows, null, 2))
            }
          >
            <Copy size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Export CSV"
            onClick={() => download("fetchxml-results.csv", toCsv(rows))}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">No rows</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`row-${index + 1}`}>
                  {columns.map((column) => (
                    <td key={column}>{String(row[column] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function getResultColumns(rows: Record<string, unknown>[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const columns = getResultColumns(rows);
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvValue(String(row[column] ?? ""))).join(","),
    ),
  ].join("\n");
}

function csvValue(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function download(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
