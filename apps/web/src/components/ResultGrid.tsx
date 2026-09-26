import {
  ArrowRight,
  Copy,
  Download,
  LoaderCircle,
  Play,
  Search,
  Table2,
} from "lucide-react";
import { useMemo, useState } from "react";

interface ResultGridProps {
  canExecute: boolean;
  hasExecuted: boolean;
  isConnected: boolean;
  onConnect: () => void;
  hasMore: boolean;
  isExecuting: boolean;
  rows: Record<string, unknown>[];
  onExecute: () => void;
  onLoadMore: () => void;
}

export function ResultGrid({
  canExecute,
  hasExecuted,
  isConnected,
  onConnect,
  hasMore,
  isExecuting,
  rows,
  onExecute,
  onLoadMore,
}: ResultGridProps) {
  const [query, setQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const columns = useMemo(() => getResultColumns(rows), [rows]);
  const filteredRows = useMemo(
    () => filterResultRows(rows, query),
    [rows, query],
  );

  return (
    <section
      className="panel results-panel"
      aria-label="Results"
      aria-busy={isExecuting}
    >
      <div className="panel-heading results-heading">
        <div className="heading-with-count">
          <h2>Query results</h2>
          <span className="count-badge">
            {rows.length.toLocaleString()} rows loaded
          </span>
        </div>
        <div className="button-row">
          <output className="copy-status">{copyStatus}</output>
          <button
            type="button"
            title="Copy JSON"
            disabled={!filteredRows.length}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(filteredRows, null, 2),
                );
                setCopyStatus("Copied");
              } catch {
                setCopyStatus("Copy failed. Try exporting CSV.");
              }
            }}
          >
            <Copy size={15} />
            <span>Copy JSON</span>
          </button>
          <button
            type="button"
            title="Export CSV"
            disabled={!filteredRows.length}
            onClick={() =>
              download("fetchxml-results.csv", toCsv(filteredRows))
            }
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state spacious">
          <div className="empty-icon">
            {isExecuting ? (
              <LoaderCircle className="spin" size={26} />
            ) : (
              <Table2 size={26} />
            )}
          </div>
          <h3>
            {isExecuting
              ? "Running your query…"
              : hasExecuted
                ? "No matching records"
                : "Your results start here"}
          </h3>
          <p>
            {isExecuting
              ? "Retrieving records from Dataverse."
              : hasExecuted
                ? "The query completed successfully. Adjust your filters and run it again."
                : isConnected
                  ? "Run your FetchXML to explore records, then copy or export the results."
                  : "Connect an environment and run your query. Your records will appear here, ready to explore and export."}
          </p>
          {!isExecuting ? (
            <button
              className="primary-action"
              type="button"
              disabled={isConnected && !canExecute}
              onClick={isConnected ? onExecute : onConnect}
            >
              {isConnected ? <Play size={15} /> : null}
              {isConnected ? "Run query" : "Set up connection"}
              <ArrowRight size={15} />
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="results-filter">
            <div className="search-box">
              <Search size={15} />
              <input
                aria-label="Search loaded results"
                placeholder="Search loaded results…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <span className="subtle">
              {filteredRows.length.toLocaleString()} of{" "}
              {rows.length.toLocaleString()} loaded rows
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="row-number" scope="col">
                    #
                  </th>
                  {columns.map((column) => (
                    <th scope="col" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={`row-${index + 1}`}>
                    <td className="row-number">{index + 1}</td>
                    {columns.map((column) => (
                      <td key={column}>{String(row[column] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <div className="empty-state spacious">
                <Search size={24} />
                <h3>No matching results</h3>
                <p>Try another search across the loaded records.</p>
                <button type="button" onClick={() => setQuery("")}>
                  Clear search
                </button>
              </div>
            ) : null}
          </div>
          <div className="results-footer">
            <span>
              {hasMore
                ? "More records are available from Dataverse."
                : "All returned records loaded."}
            </span>
            {hasMore ? (
              <button type="button" disabled={isExecuting} onClick={onLoadMore}>
                {isExecuting ? (
                  <LoaderCircle className="spin" size={14} />
                ) : null}
                {isExecuting ? "Loading…" : "Load more records"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

export function filterResultRows(
  rows: Record<string, unknown>[],
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(needle),
    ),
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
