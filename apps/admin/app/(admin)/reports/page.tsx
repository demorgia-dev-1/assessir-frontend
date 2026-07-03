"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiChevronDown,
  FiDownload,
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiRefreshCw,
  FiFileText,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBatches } from "@/store/slices/batches-slice";
import {
  fetchBatchReport,
  clearReport,
  setReportBatchId,
} from "@/store/slices/reports-slice";

/* ── Helpers ─────────────────────────────────────────── */

// Pull the candidate/result rows out of an unknown report shape.
function extractRows(report: any): Record<string, any>[] {
  if (!report) return [];
  if (Array.isArray(report)) return report;
  const candidateKeys = [
    "candidates",
    "results",
    "report",
    "reports",
    "data",
    "rows",
    "candidate_reports",
  ];
  for (const key of candidateKeys) {
    if (Array.isArray(report[key])) return report[key];
  }
  return [];
}

// Summary object (non-array scalar fields) for top-level batch stats.
function extractSummary(report: any): Record<string, any> {
  if (!report || Array.isArray(report)) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(report)) {
    if (!Array.isArray(v) && typeof v !== "object") out[k] = v;
  }
  return out;
}

function prettyHeader(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatCell(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Detect a status-like value for pass/fail/submitted counting.
function getStatusValue(row: Record<string, any>): string {
  const keys = Object.keys(row);
  const statusKey =
    keys.find((k) => /^(result|status|exam_status|final_status)$/i.test(k)) ||
    keys.find((k) => /status|result/i.test(k));
  return statusKey ? String(row[statusKey] ?? "").toLowerCase() : "";
}

const PRIORITY_COLUMNS = [
  "enrollment_no",
  "enrollmentno",
  "name",
  "candidate_name",
  "email",
];

export default function ReportsPage() {
  const dispatch = useAppDispatch();
  const { report, loading, selectedBatchId } = useAppSelector(
    (state) => state.reports
  );
  const { batches, loading: batchesLoading } = useAppSelector(
    (state) => state.batches
  );

  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchBatches({ page: 1, limit: 1000 }));
  }, [dispatch]);

  const selectedBatch = batches.find(
    (b) => String(b.id) === String(selectedBatchId)
  );

  const handleSelectBatch = (batchId: string) => {
    setSearch("");
    if (!batchId) {
      dispatch(clearReport());
      return;
    }
    dispatch(setReportBatchId(batchId));
    dispatch(fetchBatchReport(batchId));
  };

  const rows = useMemo(() => extractRows(report), [report]);
  const summary = useMemo(() => extractSummary(report), [report]);

  // Build ordered column list from the union of row keys.
  const columns = useMemo(() => {
    const keySet = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => keySet.add(k)));
    const all = Array.from(keySet);
    const priority = all.filter((k) =>
      PRIORITY_COLUMNS.includes(k.toLowerCase())
    );
    const rest = all
      .filter((k) => !PRIORITY_COLUMNS.includes(k.toLowerCase()))
      .sort();
    return [...priority, ...rest];
  }, [rows]);

  // Filtered rows by search across all values.
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => formatCell(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  // Summary stat counts derived from status fields.
  const stats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let submitted = 0;
    let pending = 0;
    rows.forEach((r) => {
      const s = getStatusValue(r);
      if (/pass/.test(s)) passed += 1;
      else if (/fail/.test(s)) failed += 1;
      if (/submit|complete|done/.test(s)) submitted += 1;
      else if (/pending|not|absent|n\/a/.test(s) || s === "") pending += 1;
    });
    return { total: rows.length, passed, failed, submitted, pending };
  }, [rows]);

  const hasStatusData = stats.passed + stats.failed > 0;

  const handleExportCsv = () => {
    if (!rows.length) return;
    const header = columns.map((c) => `"${prettyHeader(c)}"`).join(",");
    const body = filteredRows
      .map((r) =>
        columns
          .map((c) => `"${formatCell(r[c]).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedBatch?.name || `batch_${selectedBatchId}`}_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      {/* Header */}
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Insights & Results
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Reports
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {selectedBatch && rows.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FiDownload className="h-4 w-4" />
                Export CSV
              </button>
            )}
            <div className="border-l border-slate-200 pl-5 text-right">
              <p className="text-3xl font-bold text-slate-950">
                {selectedBatch ? stats.total : "—"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {selectedBatch ? "Candidates" : "Select a Batch"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Batch selector */}
      <div className="glass-panel rounded-[2rem] border border-white/80 px-6 py-5 shadow-soft shadow-slate-900/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Batch
            </p>
            <div className="relative">
              <select
                value={selectedBatchId ? String(selectedBatchId) : ""}
                onChange={(e) => handleSelectBatch(e.target.value)}
                disabled={batchesLoading}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {batchesLoading ? "Loading batches…" : "Select a batch"}
                </option>
                {batches.map((batch) => (
                  <option key={batch.id} value={String(batch.id)}>
                    #{batch.id} — {batch.name || `Batch ${batch.id}`}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {selectedBatch && (
            <button
              type="button"
              onClick={() =>
                selectedBatchId && dispatch(fetchBatchReport(selectedBatchId))
              }
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!selectedBatch ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-[2rem] border border-white/80 p-16 text-center shadow-soft shadow-slate-900/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <FiBarChart2 className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-950">
            Select a Batch
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Choose a batch above to view its assessment report, results and
            analytics.
          </p>
        </div>
      ) : loading ? (
        <div className="glass-panel flex items-center justify-center rounded-[2rem] border border-white/80 p-16 shadow-soft shadow-slate-900/5">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <FiRefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            Generating report…
          </div>
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<FiUsers className="h-5 w-5" />}
              label="Total Candidates"
              value={stats.total}
              tone="slate"
            />
            <StatCard
              icon={<FiCheckCircle className="h-5 w-5" />}
              label={hasStatusData ? "Passed" : "Submitted"}
              value={hasStatusData ? stats.passed : stats.submitted}
              tone="emerald"
            />
            <StatCard
              icon={<FiXCircle className="h-5 w-5" />}
              label={hasStatusData ? "Failed" : "Pending"}
              value={hasStatusData ? stats.failed : stats.pending}
              tone="red"
            />
            <StatCard
              icon={<FiClock className="h-5 w-5" />}
              label="Pass Rate"
              value={
                hasStatusData && stats.total > 0
                  ? `${Math.round((stats.passed / stats.total) * 100)}%`
                  : "—"
              }
              tone="indigo"
            />
          </div>

          {/* Batch-level summary fields */}
          {Object.keys(summary).length > 0 && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-6 shadow-soft shadow-slate-900/5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Batch Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(summary).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {prettyHeader(k)}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {formatCell(v)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results table */}
          <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FiFileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-950">
                  Candidate Results
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {filteredRows.length}
                </span>
              </div>
              {rows.length > 0 && (
                <div className="relative w-full sm:max-w-xs">
                  <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search results…"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                  />
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <FiBarChart2 className="mb-3 h-8 w-8 text-slate-300" />
                <h5 className="text-sm font-bold text-slate-950">
                  No Report Data
                </h5>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  This batch has no candidate results available yet.
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 border-b border-slate-150 bg-slate-50/95 backdrop-blur">
                    <tr>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        #
                      </th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                        >
                          {prettyHeader(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3 text-xs font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        {columns.map((col) => {
                          const raw = row[col];
                          const status = /status|result/i.test(col)
                            ? String(raw ?? "").toLowerCase()
                            : "";
                          return (
                            <td
                              key={col}
                              className="whitespace-nowrap px-5 py-3 text-xs text-slate-700"
                            >
                              {status ? (
                                <StatusBadge value={raw} status={status} />
                              ) : (
                                formatCell(raw)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          className="px-5 py-12 text-center text-sm text-slate-400"
                        >
                          No results match “{search}”.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "slate" | "emerald" | "red" | "indigo";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="glass-panel flex items-center gap-4 rounded-[1.75rem] border border-white/80 px-5 py-5 shadow-soft shadow-slate-900/5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold text-slate-950">{value}</p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ value, status }: { value: any; status: string }) {
  let cls = "bg-slate-100 text-slate-600 border-slate-200";
  if (/pass|submit|complete|done|present/.test(status)) {
    cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (/fail|absent|reject/.test(status)) {
    cls = "bg-red-50 text-red-700 border-red-200";
  } else if (/pending|progress|not/.test(status)) {
    cls = "bg-amber-50 text-amber-700 border-amber-200";
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cls}`}
    >
      {formatCell(value)}
    </span>
  );
}
