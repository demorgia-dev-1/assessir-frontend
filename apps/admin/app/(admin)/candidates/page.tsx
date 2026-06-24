"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiUsers,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiDownload,
  FiFileText,
  FiAlertTriangle,
  FiX,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiUserCheck,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import api from "@/lib/api";
import {
  fetchCandidates,
  createCandidates,
  deleteCandidatesFromBatch,
  resetCandidate,
  clearCandidatesError,
  clearCandidates,
  setSelectedBatchId,
} from "@/store/slices/candidates-slice";
import { fetchBatches } from "@/store/slices/batches-slice";
import {
  downloadCandidatesTemplate,
  parseCandidatesExcelFile,
} from "@/lib/candidates-import";

const INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

type RightPanelView = "idle" | "manual" | "excel";

export default function CandidatesPage() {
  const dispatch = useAppDispatch();
  const {
    candidates,
    totalCandidates,
    loading,
    creating,
    deleting,
    resetting,
    error,
    selectedBatchId,
  } = useAppSelector((state) => state.candidates);
  const { batches, loading: batchesLoading } = useAppSelector(
    (state) => state.batches
  );

  const [rightPanel, setRightPanel] = useState<RightPanelView>("idle");
  const [manualCandidates, setManualCandidates] = useState<
    Array<{ enrollment_no: string; password: string }>
  >([{ enrollment_no: "", password: "" }]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelValidationErrors, setExcelValidationErrors] = useState<
    Array<{ type: "error" | "warning"; message: string }>
  >([]);
  const [excelParsedCandidates, setExcelParsedCandidates] = useState<
    Array<{ enrollment_no: string; password: string }>
  >([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set()
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resetCandidateId, setResetCandidateId] = useState<string | number | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceTestType, setAttendanceTestType] = useState<"theory" | "practical" | "viva">("theory");
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);

  useEffect(() => {
    dispatch(fetchBatches({ page: 1, limit: 1000 }));
  }, [dispatch]);

  const selectedBatch = batches.find(
    (b) => String(b.id) === String(selectedBatchId)
  );

  const resetRightPanel = () => {
    setRightPanel("idle");
    setManualCandidates([{ enrollment_no: "", password: "" }]);
    setExcelFile(null);
    setExcelParsedCandidates([]);
    setExcelValidationErrors([]);
    setSelectedIds(new Set());
    setRevealedPasswords({});
    setLoadingPasswords({});
  };

  const handleSelectBatch = (batchId: string) => {
    if (!batchId) {
      dispatch(clearCandidates());
      resetRightPanel();
      setRevealedPasswords({});
      setLoadingPasswords({});
      return;
    }
    dispatch(setSelectedBatchId(batchId));
    dispatch(fetchCandidates(batchId));
    resetRightPanel();
    setRevealedPasswords({});
    setLoadingPasswords({});
  };

  const handleShowPassword = async (enrollmentNo: string) => {
    if (!selectedBatchId) return;

    if (revealedPasswords[enrollmentNo]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[enrollmentNo];
        return next;
      });
      return;
    }

    setLoadingPasswords((prev) => ({ ...prev, [enrollmentNo]: true }));
    try {
      const response = await api.post(`/batches/${selectedBatchId}/show-password`, {
        enrollment_no: enrollmentNo,
      });

      const pwd = response.data?.password || response.data?.Password || response.data?.data?.password || "";
      if (pwd) {
        setRevealedPasswords((prev) => ({ ...prev, [enrollmentNo]: pwd }));
      } else {
        toast.error("Password not found in response");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch password";
      toast.error(message);
    } finally {
      setLoadingPasswords((prev) => ({ ...prev, [enrollmentNo]: false }));
    }
  };

  const handleDownloadTemplate = () => {
    if (selectedBatch) {
      downloadCandidatesTemplate(
        selectedBatch.name || `batch_${selectedBatch.id}`
      );
    }
  };

  const handleManualCandidateSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedBatchId) return;

    const validCandidates = manualCandidates
      .map((c) => ({
        enrollment_no: c.enrollment_no.trim(),
        password: c.password.trim(),
      }))
      .filter((c) => c.enrollment_no && c.password);

    if (!validCandidates.length) {
      toast.error(
        "Add at least one candidate with enrollment number and password."
      );
      return;
    }

    const actionResult = await dispatch(
      createCandidates({
        batchId: selectedBatchId,
        candidates: validCandidates,
      })
    );

    if (createCandidates.fulfilled.match(actionResult)) {
      resetRightPanel();
      dispatch(fetchCandidates(selectedBatchId));
    }
  };

  const handleExcelFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      toast.error("Please upload a valid Excel file (.xlsx)");
      return;
    }

    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;
      const result = parseCandidatesExcelFile(arrayBuffer);
      setExcelParsedCandidates(result.candidates);
      setExcelValidationErrors(result.errors);
    };
    reader.onerror = () => toast.error("Failed to read Excel file.");
    reader.readAsArrayBuffer(file);
  };

  const handleSaveExcelCandidates = async () => {
    if (!selectedBatchId || !excelParsedCandidates.length) return;

    if (excelValidationErrors.some((err) => err.type === "error")) {
      toast.error("Please fix Excel validation errors before importing.");
      return;
    }

    const actionResult = await dispatch(
      createCandidates({
        batchId: selectedBatchId,
        candidates: excelParsedCandidates,
      })
    );

    if (createCandidates.fulfilled.match(actionResult)) {
      resetRightPanel();
      dispatch(fetchCandidates(selectedBatchId));
    }
  };

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id!)));
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBatchId || selectedIds.size === 0) return;

    const actionResult = await dispatch(
      deleteCandidatesFromBatch({
        batchId: selectedBatchId,
        candidateIds: Array.from(selectedIds),
      })
    );

    if (deleteCandidatesFromBatch.fulfilled.match(actionResult)) {
      setSelectedIds(new Set());
      setShowDeleteModal(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedBatchId || selectedIds.size === 0) return;
    setIsMarkingAttendance(true);
    try {
      const res = await api.post(
        `/batches/${selectedBatchId}/mark-attendance?testType=${attendanceTestType}`,
        { candidate_ids: Array.from(selectedIds) }
      );
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(
          `Attendance marked for ${selectedIds.size} candidate${selectedIds.size > 1 ? "s" : ""} (${attendanceTestType}).`
        );
        setShowAttendanceModal(false);
        setSelectedIds(new Set());
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to mark attendance.";
      toast.error(msg);
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!selectedBatchId || !resetCandidateId) return;

    const actionResult = await dispatch(
      resetCandidate({ batchId: selectedBatchId, candidateId: resetCandidateId })
    );

    if (resetCandidate.fulfilled.match(actionResult)) {
      setResetCandidateId(null);
      dispatch(fetchCandidates(selectedBatchId));
    }
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      {/* Header */}
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Candidate Management
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Candidates
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {selectedBatch && (
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FiDownload className="h-4 w-4" />
                Download Template
              </button>
            )}
            <div className="border-l border-slate-200 pl-5 text-right">
              <p className="text-3xl font-bold text-slate-950">
                {selectedBatch ? totalCandidates : "—"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {selectedBatch ? "Registered Candidates" : "Select a Batch"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 gap-6 lg:min-h-[calc(100vh-18rem)] lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT PANEL — Candidates List */}
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          {/* Batch selector inside left panel header */}
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
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
                        {batch.jobRole?.name ||
                        batch.job_role?.name ||
                        batch.jobrole?.name
                          ? ` · ${
                              batch.jobRole?.name ||
                              batch.job_role?.name ||
                              batch.jobrole?.name
                            }`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {selectedBatch && (
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-slate-950">
                    {totalCandidates}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Candidates
                  </p>
                </div>
              )}
            </div>

            {selectedBatch && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-bold text-white">
                  {selectedBatch.id}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-900">
                    {selectedBatch.name || `Batch #${selectedBatch.id}`}
                  </span>
                  {(selectedBatch.jobRole?.name ||
                    selectedBatch.job_role?.name ||
                    selectedBatch.jobrole?.name) && (
                    <span className="ml-2 text-[10px] text-slate-400">
                      {selectedBatch.jobRole?.name ||
                        selectedBatch.job_role?.name ||
                        selectedBatch.jobrole?.name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Candidates table / empty states */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {!selectedBatch ? (
              <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <FiUsers className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-950">
                  Select a Batch
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                  Choose a batch from the dropdown above to view its candidates.
                </p>
              </div>
            ) : loading && candidates.length === 0 ? (
              <div className="flex h-32 animate-pulse items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">
                Loading candidates…
              </div>
            ) : candidates.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-150 shadow-sm">
                {selectedIds.size > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
                    <span className="text-xs font-semibold text-slate-700">
                      {selectedIds.size} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttendanceModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <FiUserCheck className="h-3.5 w-3.5" />
                        Mark Attendance
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                        Delete Selected
                      </button>
                    </div>
                  </div>
                )}
                <table className="w-full text-left">
                  <thead className="border-b border-slate-150 bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={
                            candidates.length > 0 &&
                            selectedIds.size === candidates.length
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-950 cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        #
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Enrollment No
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Password
                      </th>
                      <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {candidates.map((cand, idx) => {
                      const isChecked = selectedIds.has(cand.id!);
                      return (
                        <tr
                          key={cand.id || idx}
                          onClick={() => toggleSelect(cand.id!)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50/50 ${
                            isChecked ? "bg-red-50/40" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(cand.id!)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 accent-slate-950 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                            {cand.enrollment_no}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <code className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 font-mono text-[11px] min-w-[80px] text-center inline-block">
                                {revealedPasswords[cand.enrollment_no]
                                  ? revealedPasswords[cand.enrollment_no]
                                  : "••••••••"}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleShowPassword(cand.enrollment_no)}
                                className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-100 flex items-center justify-center shrink-0"
                                title={revealedPasswords[cand.enrollment_no] ? "Hide Password" : "Show Password"}
                                disabled={loadingPasswords[cand.enrollment_no]}
                              >
                                {loadingPasswords[cand.enrollment_no] ? (
                                  <svg className="animate-spin h-3.5 w-3.5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : revealedPasswords[cand.enrollment_no] ? (
                                  <FiEyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <FiEye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setResetCandidateId(cand.id!)}
                              disabled={resetting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                              title="Reset Candidate"
                            >
                              <FiRefreshCw className="h-3.5 w-3.5" />
                              Reset
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <FiUsers className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                <h5 className="text-sm font-bold text-slate-950">
                  No Candidates Registered
                </h5>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  Use the panel on the right to add candidates manually or
                  upload an Excel file.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Add / Upload */}
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-sm font-bold text-slate-950">Add Candidates</h2>
            <p className="mt-1 text-xs text-slate-500">
              {selectedBatch
                ? `Adding to: ${
                    selectedBatch.name || `Batch #${selectedBatch.id}`
                  }`
                : "Select a batch first to add candidates."}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {!selectedBatch ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <FiUsers className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-950">
                  No batch selected
                </p>
                <p className="text-xs text-slate-500">
                  Choose a batch on the left to get started.
                </p>
              </div>
            ) : rightPanel === "idle" ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setRightPanel("manual")}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <FiPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Add Manually
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Type enrollment numbers and passwords one by one.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanel("excel")}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <FiUploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Upload Excel
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Import multiple candidates from an .xlsx file.
                    </p>
                  </div>
                </button>

                <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Need the template?
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Download the Excel template pre-filled for this batch.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiDownload className="h-3.5 w-3.5" />
                    Download Template
                  </button>
                </div>
              </div>
            ) : rightPanel === "manual" ? (
              <form
                onSubmit={handleManualCandidateSave}
                className="flex h-full flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    Add Manually
                  </h4>
                  <button
                    type="button"
                    onClick={resetRightPanel}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Enrollment No
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </span>
                    <span />
                  </div>
                  {manualCandidates.map((cand, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                    >
                      <input
                        type="text"
                        value={cand.enrollment_no}
                        onChange={(e) => {
                          const next = [...manualCandidates];
                          next[idx].enrollment_no = e.target.value;
                          setManualCandidates(next);
                        }}
                        placeholder="e.g. ENR001"
                        className={INPUT_CLASS}
                        required
                      />
                      <input
                        type="text"
                        value={cand.password}
                        onChange={(e) => {
                          const next = [...manualCandidates];
                          next[idx].password = e.target.value;
                          setManualCandidates(next);
                        }}
                        placeholder="Password"
                        className={INPUT_CLASS}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (manualCandidates.length > 1)
                            setManualCandidates(
                              manualCandidates.filter((_, i) => i !== idx)
                            );
                        }}
                        disabled={manualCandidates.length <= 1}
                        className="rounded-xl border border-red-200 p-2.5 text-red-500 transition hover:bg-red-50 disabled:opacity-30"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setManualCandidates([
                        ...manualCandidates,
                        { enrollment_no: "", password: "" },
                      ])
                    }
                    className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-950"
                  >
                    <FiPlus className="h-3.5 w-3.5" /> Add Row
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetRightPanel}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 rounded-xl bg-slate-950 py-2.5 text-xs font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                    >
                      {creating ? "Saving…" : "Save Candidates"}
                    </button>
                  </div>
                </div>
              </form>
            ) : rightPanel === "excel" ? (
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    Upload Excel
                  </h4>
                  <button
                    type="button"
                    onClick={resetRightPanel}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1">
                  {!excelFile ? (
                    <div className="space-y-3">
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 transition hover:border-slate-400">
                        <FiUploadCloud className="mb-2 h-8 w-8 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">
                          Click to upload .xlsx file
                        </span>
                        <span className="mt-1 text-[10px] text-slate-400">
                          Only .xlsx template files accepted
                        </span>
                        <input
                          type="file"
                          accept=".xlsx"
                          onChange={handleExcelFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiDownload className="h-3.5 w-3.5" />
                        Download Template First
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FiFileText className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-950">
                              {excelFile.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {excelParsedCandidates.length} rows parsed
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExcelFile(null);
                            setExcelParsedCandidates([]);
                            setExcelValidationErrors([]);
                          }}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      {excelValidationErrors.length > 0 && (
                        <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                          {excelValidationErrors.map((err, idx) => (
                            <p
                              key={idx}
                              className="flex items-start gap-1 text-[11px] text-amber-800"
                            >
                              <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                              <span>{err.message}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {excelFile && (
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetRightPanel}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveExcelCandidates}
                        disabled={
                          creating ||
                          excelValidationErrors.some(
                            (e) => e.type === "error"
                          ) ||
                          excelParsedCandidates.length === 0
                        }
                        className="flex-1 rounded-xl bg-slate-950 py-2.5 text-xs font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                      >
                        {creating
                          ? "Saving…"
                          : `Import ${excelParsedCandidates.length} Candidates`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bulk delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <FiAlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Remove Candidates
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Action is Permanent
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-950">
                {selectedIds.size} candidate{selectedIds.size > 1 ? "s" : ""}
              </span>{" "}
              from this batch?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50 active:scale-[0.98]"
                disabled={deleting}
              >
                {deleting
                  ? "Removing…"
                  : `Remove ${
                      selectedIds.size > 1
                        ? `${selectedIds.size} Candidates`
                        : "Candidate"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset candidate confirmation modal */}
      {resetCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <FiAlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Reset Candidate
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Please Confirm
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Are you sure you want to reset candidate{" "}
              <span className="font-semibold text-slate-950">
                {candidates.find((c) => c.id === resetCandidateId)?.enrollment_no || resetCandidateId}
              </span>
              ? This will clear their exam progress.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setResetCandidateId(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:opacity-50 active:scale-[0.98]"
                disabled={resetting}
              >
                {resetting ? "Resetting…" : "Reset Candidate"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mark attendance modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <FiUserCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Mark Attendance
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {selectedIds.size} Candidate{selectedIds.size > 1 ? "s" : ""} Selected
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Test Type
              </label>
              <select
                value={attendanceTestType}
                onChange={(e) => setAttendanceTestType(e.target.value as "theory" | "practical" | "viva")}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
              >
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
                <option value="viva">Viva</option>
              </select>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Mark attendance for{" "}
              <span className="font-semibold text-slate-950">
                {selectedIds.size} candidate{selectedIds.size > 1 ? "s" : ""}
              </span>{" "}
              in the{" "}
              <span className="font-semibold text-slate-950 capitalize">
                {attendanceTestType}
              </span>{" "}
              test?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                disabled={isMarkingAttendance}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkAttendance}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98]"
                disabled={isMarkingAttendance}
              >
                {isMarkingAttendance ? "Marking…" : "Confirm Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
