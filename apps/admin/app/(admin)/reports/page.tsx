"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiSearch,
  FiUsers,
  FiRefreshCw,
  FiFileText,
  FiLayers,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBatches } from "@/store/slices/batches-slice";
import { fetchSectors } from "@/store/slices/sectors-slice";
import {
  fetchBatchReport,
  clearReport,
  setReportBatchId,
} from "@/store/slices/reports-slice";
import api from "@/lib/api";
import { SearchableSelect } from "@/components/SearchableSelect";

/* ── Types & helpers ─────────────────────────────────── */

type NosColumn = { name?: string; code: string; marks?: string | number };

type ReportRow = {
  name?: string;
  enrollment_no?: string;
  theory_exam_status?: string | null;
  practical_exam_status?: string | null;
  viva_exam_status?: string | null;
  theory?: NosColumn[];
  practical?: NosColumn[];
  viva?: NosColumn[];
  [key: string]: any;
};

type ReportShape = {
  header?: {
    theory?: NosColumn[];
    practical?: NosColumn[];
    viva?: NosColumn[];
  };
  rows?: ReportRow[];
};

const TEST_TYPES = ["theory", "practical", "viva"] as const;
type TestType = (typeof TEST_TYPES)[number];

// Light colour per test type so theory / practical / viva groups are easy to
// tell apart at a glance.
const TYPE_TINT: Record<
  TestType,
  { header: string; subHeader: string; cell: string; divide: string }
> = {
  theory: {
    header: "bg-blue-100/70 text-blue-700",
    subHeader: "bg-blue-50 text-blue-600",
    cell: "bg-blue-50/40",
    divide: "border-blue-200",
  },
  practical: {
    header: "bg-emerald-100/70 text-emerald-700",
    subHeader: "bg-emerald-50 text-emerald-600",
    cell: "bg-emerald-50/40",
    divide: "border-emerald-200",
  },
  viva: {
    header: "bg-amber-100/70 text-amber-700",
    subHeader: "bg-amber-50 text-amber-600",
    cell: "bg-amber-50/40",
    divide: "border-amber-200",
  },
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCell(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

// A candidate is absent for a test type when its exam status is missing
// (null) or "unauthorized".
function isAbsent(status: any): boolean {
  const s = String(status ?? "").toLowerCase().trim();
  return s === "" || s === "unauthorized";
}

// A candidate's marks for a given NOS (matched by code) within a test type.
function getNosMark(row: ReportRow, type: TestType, code: string): string {
  const arr = Array.isArray(row[type]) ? (row[type] as NosColumn[]) : [];
  const found = arr.find((n) => n.code === code);
  return found?.marks !== undefined && found?.marks !== null
    ? String(found.marks)
    : "—";
}

export default function ReportsPage() {
  const dispatch = useAppDispatch();
  const { report, loading, selectedBatchId } = useAppSelector(
    (state) => state.reports
  );
  const { batches, loading: batchesLoading } = useAppSelector(
    (state) => state.batches
  );
  const { sectors } = useAppSelector((state) => state.sectors);

  const [search, setSearch] = useState("");
  // Cascading filters: sector → job role → batch.
  const [filterSectorId, setFilterSectorId] = useState("");
  const [filterJobRoleId, setFilterJobRoleId] = useState("");
  const [filterJobRoles, setFilterJobRoles] = useState<
    Array<{ id: string | number; name?: string }>
  >([]);
  const [filterJobRolesLoading, setFilterJobRolesLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchBatches({ page: 1, limit: 1000 }));
    dispatch(fetchSectors({ page: 1, limit: 1000 }));
  }, [dispatch]);

  // Load the sector's job roles for the cascade.
  useEffect(() => {
    if (!filterSectorId) {
      setFilterJobRoles([]);
      return;
    }
    let active = true;
    setFilterJobRolesLoading(true);
    api
      .get("/jobroles", { params: { sector_id: filterSectorId, limit: 1000 } })
      .then((res) => {
        if (!active) return;
        const data = res.data;
        setFilterJobRoles(
          Array.isArray(data) ? data : data?.jobroles || data?.jobRoles || []
        );
      })
      .catch(() => {
        if (active) setFilterJobRoles([]);
      })
      .finally(() => {
        if (active) setFilterJobRolesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filterSectorId]);

  const selectedBatch = batches.find(
    (b) => String(b.id) === String(selectedBatchId)
  );

  const handleFilterSectorChange = (value: string) => {
    setFilterSectorId(value);
    setFilterJobRoleId("");
    dispatch(clearReport());
    dispatch(fetchBatches({ page: 1, limit: 1000 }));
  };

  const handleFilterJobRoleChange = (value: string) => {
    setFilterJobRoleId(value);
    dispatch(clearReport());
    dispatch(
      fetchBatches({
        page: 1,
        limit: 1000,
        ...(value ? { job_role_id: value } : {}),
      })
    );
  };

  const handleSelectBatch = (batchId: string) => {
    setSearch("");
    if (!batchId) {
      dispatch(clearReport());
      return;
    }
    const batch = batches.find((b) => String(b.id) === String(batchId));
    dispatch(setReportBatchId(batchId));
    dispatch(fetchBatchReport({ batchId, jobRoleId: batch?.job_role_id }));
  };

  const reportData = report as ReportShape | null;
  const header = reportData?.header ?? {};
  const rows = useMemo<ReportRow[]>(
    () => (Array.isArray(reportData?.rows) ? reportData!.rows! : []),
    [reportData]
  );

  // Only render test types that have NOS columns in the header.
  const activeTypes = useMemo<TestType[]>(
    () =>
      TEST_TYPES.filter(
        (t) => Array.isArray(header[t]) && header[t]!.length > 0
      ),
    [header]
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        String(r.enrollment_no ?? "")
          .toLowerCase()
          .includes(q) ||
        String(r.name ?? "")
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search]);

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      {/* Header */}
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-5 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Insights & Results
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
              Reports
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="border-l border-slate-200 pl-5 text-right">
              <p className="text-2xl font-bold text-slate-950">
                {selectedBatch ? rows.length : "—"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {selectedBatch ? "Candidates" : "Select a Batch"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters: sector → job role → batch */}
      <div className="glass-panel relative z-30 rounded-[2rem] border border-white/80 px-6 py-5 shadow-soft shadow-slate-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Sector */}
          <div className="w-full lg:flex-1">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Sector
            </p>
            <SearchableSelect
              value={filterSectorId}
              onChange={handleFilterSectorChange}
              searchPlaceholder="Search sectors…"
              options={[
                { value: "", label: "All sectors" },
                ...sectors.map((sector) => ({
                  value: String(sector.id),
                  label: sector.name,
                })),
              ]}
            />
          </div>

          {/* Job role */}
          <div className="w-full lg:flex-1">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Job Role
            </p>
            <SearchableSelect
              value={filterJobRoleId}
              onChange={handleFilterJobRoleChange}
              disabled={filterJobRolesLoading}
              searchPlaceholder="Search job roles…"
              options={[
                {
                  value: "",
                  label: filterJobRolesLoading
                    ? "Loading job roles…"
                    : filterSectorId
                    ? "All job roles in sector"
                    : "All job roles",
                },
                ...filterJobRoles.map((jobRole) => ({
                  value: String(jobRole.id),
                  label: jobRole.name || `Job Role ${jobRole.id}`,
                })),
              ]}
            />
          </div>

          {/* Batch */}
          <div className="w-full lg:flex-1">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Batch
            </p>
            <SearchableSelect
              value={selectedBatchId ? String(selectedBatchId) : ""}
              onChange={handleSelectBatch}
              disabled={batchesLoading}
              searchPlaceholder="Search batches…"
              options={[
                {
                  value: "",
                  label: batchesLoading ? "Loading batches…" : "Select a batch",
                },
                ...batches.map((batch) => ({
                  value: String(batch.id),
                  label: `#${batch.id} — ${batch.name || `Batch ${batch.id}`}`,
                })),
              ]}
            />
          </div>

          {selectedBatch && (
            <button
              type="button"
              onClick={() =>
                selectedBatchId &&
                dispatch(
                  fetchBatchReport({
                    batchId: selectedBatchId,
                    jobRoleId: selectedBatch?.job_role_id,
                  })
                )
              }
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
            Choose a batch above to view its assessment report and NOS-wise
            marks.
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
              label="Candidates"
              value={rows.length}
              tone="slate"
            />
            <StatCard
              icon={<FiLayers className="h-5 w-5" />}
              label="Theory NOS"
              value={header.theory?.length ?? 0}
              tone="indigo"
            />
            <StatCard
              icon={<FiLayers className="h-5 w-5" />}
              label="Practical NOS"
              value={header.practical?.length ?? 0}
              tone="emerald"
            />
            <StatCard
              icon={<FiLayers className="h-5 w-5" />}
              label="Viva NOS"
              value={header.viva?.length ?? 0}
              tone="amber"
            />
          </div>

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
                    placeholder="Search enrollment or name…"
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
                    {/* Group header row */}
                    <tr>
                      <th
                        rowSpan={2}
                        className="whitespace-nowrap border-b border-slate-150 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        #
                      </th>
                      <th
                        rowSpan={2}
                        className="whitespace-nowrap border-b border-slate-150 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        Enrollment No
                      </th>
                      <th
                        rowSpan={2}
                        className="whitespace-nowrap border-b border-slate-150 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        Name
                      </th>
                      {activeTypes.map((type) => (
                        <th
                          key={type}
                          colSpan={1 + (header[type]?.length ?? 0)}
                          className={`whitespace-nowrap border-l-2 border-slate-300 px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider ${TYPE_TINT[type].header}`}
                        >
                          {titleCase(type)}
                        </th>
                      ))}
                    </tr>
                    {/* Column header row */}
                    <tr>
                      {activeTypes.map((type) => (
                        <FragmentCols key={type}>
                          <th
                            className={`whitespace-nowrap border-l-2 border-slate-300 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_TINT[type].subHeader}`}
                          >
                            Status
                          </th>
                          {(header[type] || []).map((nos) => (
                            <th
                              key={`${type}-${nos.code}`}
                              className={`whitespace-nowrap border-l px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider ${TYPE_TINT[type].divide} ${TYPE_TINT[type].subHeader}`}
                              title={nos.name}
                            >
                              {nos.code}
                              {nos.marks ? (
                                <span className="block text-[9px] font-semibold normal-case tracking-normal opacity-70">
                                  / {nos.marks}
                                </span>
                              ) : null}
                            </th>
                          ))}
                        </FragmentCols>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={row.enrollment_no || idx}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3 text-xs font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-slate-900">
                          {formatCell(row.enrollment_no)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-700">
                          {formatCell(row.name)}
                        </td>
                        {activeTypes.map((type) => {
                          const status = row[`${type}_exam_status`];
                          const nosCount = header[type]?.length ?? 0;

                          // Absent → one "Absent" cell spanning the whole
                          // status + NOS-marks group for this test type.
                          if (isAbsent(status)) {
                            return (
                              <td
                                key={type}
                                colSpan={1 + nosCount}
                                className={`border-l-2 border-slate-300 px-5 py-3 text-center ${TYPE_TINT[type].cell}`}
                              >
                                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                                  Absent
                                </span>
                              </td>
                            );
                          }

                          return (
                            <FragmentCols key={type}>
                              <td
                                className={`whitespace-nowrap border-l-2 border-slate-300 px-5 py-3 text-xs ${TYPE_TINT[type].cell}`}
                              >
                                <StatusBadge value={status} />
                              </td>
                              {(header[type] || []).map((nos) => (
                                <td
                                  key={`${type}-${nos.code}`}
                                  className={`whitespace-nowrap border-l px-5 py-3 text-center text-xs font-semibold text-slate-700 ${TYPE_TINT[type].divide} ${TYPE_TINT[type].cell}`}
                                >
                                  {getNosMark(row, type, nos.code)}
                                </td>
                              ))}
                            </FragmentCols>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={
                            3 +
                            activeTypes.reduce(
                              (sum, t) => sum + 1 + (header[t]?.length ?? 0),
                              0
                            )
                          }
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

// Renders a set of <th>/<td> siblings without an extra wrapper element.
function FragmentCols({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "slate" | "emerald" | "red" | "indigo" | "amber";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
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

function StatusBadge({ value }: { value: any }) {
  const status = String(value ?? "").toLowerCase();
  if (!status) {
    return <span className="text-slate-300">—</span>;
  }
  let cls = "bg-slate-100 text-slate-600 border-slate-200";
  if (/pass|submit|complete|done|present|authorized/.test(status)) {
    cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (/fail|absent|reject|unauthorized/.test(status)) {
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
