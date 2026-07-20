"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiPause,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUploadCloud,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSelectedBatch,
  fetchBatchById,
} from "@/store/slices/batches-slice";
import {
  createCandidates,
  deleteCandidatesFromBatch,
  fetchCandidates,
  resetCandidate,
} from "@/store/slices/candidates-slice";
import {
  downloadCandidatesTemplate,
  parseCandidatesExcelFile,
} from "@/lib/candidates-import";
import api from "@/lib/api";
import {
  AttendanceTestType,
  EXAM_STATUS_META,
  INPUT_CLASS,
  canonicalExamStatus,
  examStatusLabel,
  formatDateTime,
  formatHeartbeat,
  getAttendanceTestOptions,
  getBatchJobRoleName,
  getTestIdForType,
} from "../batch-shared";

function BatchCandidatesInner() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId");

  const { selectedBatch } = useAppSelector((state) => state.batches);
  const {
    candidates: batchCandidates,
    loading: candidatesLoading,
    deleting: candidatesDeleting,
    resetting: candidatesResetting,
  } = useAppSelector((state) => state.candidates);

  const [isAddingManually, setIsAddingManually] = useState(false);
  const [manualCandidates, setManualCandidates] = useState<
    Array<{ enrollment_no: string; password: string }>
  >([{ enrollment_no: "", password: "" }]);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelValidationErrors, setExcelValidationErrors] = useState<
    Array<{ type: "error" | "warning"; message: string }>
  >([]);
  const [excelParsedCandidates, setExcelParsedCandidates] = useState<
    Array<{ enrollment_no: string; password: string }>
  >([]);
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string>
  >({});
  const [loadingPasswords, setLoadingPasswords] = useState<
    Record<string, boolean>
  >({});
  const [candidateSelectedIds, setCandidateSelectedIds] = useState<
    Set<string | number>
  >(new Set());
  const [showCandidateDeleteModal, setShowCandidateDeleteModal] =
    useState(false);
  const [resetCandidateId, setResetCandidateId] = useState<
    string | number | null
  >(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceTestType, setAttendanceTestType] =
    useState<AttendanceTestType>("theory");
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [pauseTestType, setPauseTestType] =
    useState<AttendanceTestType>("theory");
  const [pauseLoading, setPauseLoading] = useState<
    Record<string | number, boolean>
  >({});

  const attendanceTestOptions = useMemo(
    () => getAttendanceTestOptions(selectedBatch),
    [selectedBatch]
  );

  useEffect(() => {
    if (batchId) {
      dispatch(fetchBatchById(batchId));
      dispatch(fetchCandidates(batchId));
    }
    return () => {
      dispatch(clearSelectedBatch());
    };
  }, [dispatch, batchId]);

  useEffect(() => {
    if (
      attendanceTestOptions.length > 0 &&
      !attendanceTestOptions.some((type) => type.value === attendanceTestType)
    ) {
      setAttendanceTestType(attendanceTestOptions[0].value);
    }
  }, [attendanceTestOptions, attendanceTestType]);

  useEffect(() => {
    if (
      attendanceTestOptions.length > 0 &&
      !attendanceTestOptions.some((type) => type.value === pauseTestType)
    ) {
      setPauseTestType(attendanceTestOptions[0].value);
    }
  }, [attendanceTestOptions, pauseTestType]);

  const handleShowPassword = async (enrollmentNo: string) => {
    if (!selectedBatch) return;

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
      const response = await api.post(
        `/batches/${selectedBatch.id}/show-password`,
        { enrollment_no: enrollmentNo }
      );
      const pwd =
        response.data?.password ||
        response.data?.Password ||
        response.data?.data?.password ||
        "";
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

  const toggleCandidateSelect = (id: string | number) => {
    setCandidateSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCandidateSelectAll = () => {
    if (candidateSelectedIds.size === batchCandidates.length) {
      setCandidateSelectedIds(new Set());
    } else {
      setCandidateSelectedIds(new Set(batchCandidates.map((cand) => cand.id!)));
    }
  };

  const handleConfirmCandidateDelete = async () => {
    if (!selectedBatch || candidateSelectedIds.size === 0) return;
    const actionResult = await dispatch(
      deleteCandidatesFromBatch({
        batchId: selectedBatch.id,
        candidateIds: Array.from(candidateSelectedIds),
      })
    );
    if (deleteCandidatesFromBatch.fulfilled.match(actionResult)) {
      setCandidateSelectedIds(new Set());
      setShowCandidateDeleteModal(false);
      dispatch(fetchCandidates(selectedBatch.id));
    }
  };

  const handleConfirmResetCandidate = async () => {
    if (!selectedBatch || !resetCandidateId) return;
    const actionResult = await dispatch(
      resetCandidate({
        batchId: selectedBatch.id,
        candidateId: resetCandidateId,
      })
    );
    if (resetCandidate.fulfilled.match(actionResult)) {
      setResetCandidateId(null);
      dispatch(fetchCandidates(selectedBatch.id));
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedBatch || candidateSelectedIds.size === 0) return;
    if (attendanceTestOptions.length === 0) {
      toast.error("No test is available for attendance in this batch.");
      return;
    }
    setIsMarkingAttendance(true);
    try {
      const res = await api.post(
        `/batches/${selectedBatch.id}/mark-attendance?testType=${attendanceTestType}`,
        { candidate_ids: Array.from(candidateSelectedIds) }
      );
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(
          `Attendance marked for ${candidateSelectedIds.size} candidate${
            candidateSelectedIds.size > 1 ? "s" : ""
          } (${attendanceTestType}).`
        );
        setShowAttendanceModal(false);
        setCandidateSelectedIds(new Set());
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

  const handleResumeOrPause = async (
    candidateId: string | number,
    pause: boolean
  ) => {
    if (!selectedBatch) return;
    const testId = getTestIdForType(selectedBatch, pauseTestType);
    if (!testId) {
      toast.error("No test is available to pause/resume for this batch.");
      return;
    }
    setPauseLoading((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const res = await api.post(
        `/batches/${selectedBatch.id}/resume-or-pause`,
        { pause, test_id: testId, candidate_id: candidateId }
      );
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      toast.success(
        pause ? "Test paused for candidate." : "Test resumed for candidate."
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to update the candidate's test state.";
      toast.error(msg);
    } finally {
      setPauseLoading((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const handleDownloadCandidatesTemplate = () => {
    if (selectedBatch) {
      downloadCandidatesTemplate(
        selectedBatch.name || `batch_${selectedBatch.id}`
      );
    }
  };

  const handleManualCandidateSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedBatch) return;
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
        batchId: selectedBatch.id,
        candidates: validCandidates,
      })
    );
    if (createCandidates.fulfilled.match(actionResult)) {
      setIsAddingManually(false);
      setManualCandidates([{ enrollment_no: "", password: "" }]);
      dispatch(fetchCandidates(selectedBatch.id));
    }
  };

  const handleExcelCandidatesFileChange = (
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
    if (!selectedBatch || !excelParsedCandidates.length) return;
    if (excelValidationErrors.some((err) => err.type === "error")) {
      toast.error("Please fix Excel validation errors before importing.");
      return;
    }
    const actionResult = await dispatch(
      createCandidates({
        batchId: selectedBatch.id,
        candidates: excelParsedCandidates,
      })
    );
    if (createCandidates.fulfilled.match(actionResult)) {
      setExcelFile(null);
      setExcelParsedCandidates([]);
      setExcelValidationErrors([]);
      setIsUploadingExcel(false);
      dispatch(fetchCandidates(selectedBatch.id));
    }
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-6 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/batches")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Candidates
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {selectedBatch?.name || "Batch"}
              </h1>
              {selectedBatch && (
                <p className="mt-1 text-sm text-slate-600">
                  #{selectedBatch.id} · {getBatchJobRoleName(selectedBatch)}
                </p>
              )}
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {batchCandidates.length} registered
          </span>
        </div>
      </header>

      <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
        <div className="space-y-4">
          {isAddingManually ? (
            <form
              onSubmit={handleManualCandidateSave}
              className="space-y-4 rounded-2xl border border-slate-100 p-5 bg-slate-50/50"
            >
              <h4 className="text-sm font-bold text-slate-900">
                Add Candidates Manually
              </h4>
              <div className="space-y-3">
                {manualCandidates.map((cand, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={cand.enrollment_no}
                      onChange={(e) => {
                        const next = [...manualCandidates];
                        next[idx].enrollment_no = e.target.value;
                        setManualCandidates(next);
                      }}
                      placeholder="Enrollment No"
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
                        if (manualCandidates.length > 1) {
                          setManualCandidates(
                            manualCandidates.filter((_, i) => i !== idx)
                          );
                        }
                      }}
                      disabled={manualCandidates.length <= 1}
                      className="rounded-xl border border-red-200 p-3 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() =>
                    setManualCandidates([
                      ...manualCandidates,
                      { enrollment_no: "", password: "" },
                    ])
                  }
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 transition"
                >
                  <FiPlus className="h-3.5 w-3.5" /> Add Row
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingManually(false);
                      setManualCandidates([
                        { enrollment_no: "", password: "" },
                      ]);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={candidatesLoading}
                    className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 shadow-md transition hover:opacity-90"
                  >
                    {candidatesLoading ? "Saving..." : "Save Candidates"}
                  </button>
                </div>
              </div>
            </form>
          ) : isUploadingExcel ? (
            <div className="space-y-4 rounded-2xl border border-slate-100 p-5 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-900">
                  Upload Excel Sheet
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadCandidatesTemplate}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1"
                >
                  <FiDownload className="h-3.5 w-3.5" /> Download Template
                </button>
              </div>

              {!excelFile ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8 cursor-pointer hover:border-slate-400 transition-all duration-300">
                  <FiUploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    Click to upload candidates Excel file
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Accepts only .xlsx template files
                  </span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleExcelCandidatesFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white border border-slate-100 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <FiFileText className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-950">
                          {excelFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Parsed {excelParsedCandidates.length} rows
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
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  {excelValidationErrors.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 max-h-36 overflow-y-auto space-y-1">
                      {excelValidationErrors.map((err, idx) => (
                        <p
                          key={idx}
                          className="text-[11px] text-amber-800 flex items-start gap-1"
                        >
                          <FiAlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <span>{err.message}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadingExcel(false);
                        setExcelFile(null);
                        setExcelParsedCandidates([]);
                        setExcelValidationErrors([]);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveExcelCandidates}
                      disabled={
                        candidatesLoading ||
                        excelValidationErrors.some((e) => e.type === "error") ||
                        excelParsedCandidates.length === 0
                      }
                      className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                    >
                      {candidatesLoading ? "Saving..." : "Save Candidates"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Registered Candidates
                  </span>
                  {attendanceTestOptions.length > 1 && (
                    <select
                      value={pauseTestType}
                      onChange={(e) =>
                        setPauseTestType(e.target.value as AttendanceTestType)
                      }
                      title="Test used for pause / resume"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      {attendanceTestOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingManually(true)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-350 transition"
                  >
                    Add Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadingExcel(true)}
                    className="rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
                  >
                    Upload Excel
                  </button>
                </div>
              </div>

              {candidatesLoading && batchCandidates.length === 0 ? (
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  Loading candidates...
                </div>
              ) : batchCandidates.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-150 shadow-sm">
                  {candidateSelectedIds.size > 0 && (
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {candidateSelectedIds.size} selected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (attendanceTestOptions[0]) {
                              setAttendanceTestType(
                                attendanceTestOptions[0].value
                              );
                            }
                            setShowAttendanceModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <FiUserCheck className="h-3.5 w-3.5" />
                          Mark Attendance
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCandidateDeleteModal(true)}
                          disabled={candidatesDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                          Delete Selected
                        </button>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/70 border-b border-slate-150">
                      <tr>
                        <th className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={
                              batchCandidates.length > 0 &&
                              candidateSelectedIds.size ===
                                batchCandidates.length
                            }
                            onChange={toggleCandidateSelectAll}
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
                          Exam Status
                        </th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Last Heartbeat
                        </th>
                        <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {batchCandidates.map((cand, idx) => (
                        <tr
                          key={cand.id || idx}
                          onClick={() => toggleCandidateSelect(cand.id!)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50/50 ${
                            candidateSelectedIds.has(cand.id!)
                              ? "bg-red-50/40"
                              : ""
                          }`}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={candidateSelectedIds.has(cand.id!)}
                              onChange={() => toggleCandidateSelect(cand.id!)}
                              className="h-4 w-4 rounded border-slate-300 accent-slate-950 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                            {cand.enrollment_no}
                          </td>
                          <td
                            className="px-5 py-3 text-xs text-slate-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <code className="bg-slate-50 rounded px-2 py-0.5 font-mono text-[11px] border border-slate-100 min-w-[80px] text-center inline-block">
                                {revealedPasswords[cand.enrollment_no]
                                  ? revealedPasswords[cand.enrollment_no]
                                  : "••••••••"}
                              </code>
                              <button
                                type="button"
                                onClick={() =>
                                  handleShowPassword(cand.enrollment_no)
                                }
                                className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-100 flex items-center justify-center shrink-0"
                                title={
                                  revealedPasswords[cand.enrollment_no]
                                    ? "Hide Password"
                                    : "Show Password"
                                }
                                disabled={loadingPasswords[cand.enrollment_no]}
                              >
                                {loadingPasswords[cand.enrollment_no] ? (
                                  <svg
                                    className="animate-spin h-3.5 w-3.5 text-slate-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                ) : revealedPasswords[cand.enrollment_no] ? (
                                  <FiEyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <FiEye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td
                            className="px-5 py-3 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-col gap-2">
                              {attendanceTestOptions.length ? (
                                attendanceTestOptions.map((opt) => {
                                  const rawStatus = (cand as any)[
                                    `${opt.value}_exam_status`
                                  ];
                                  const isAuth = (cand as any)[
                                    `is_authorized_for_${opt.value}`
                                  ];
                                  const canonical =
                                    canonicalExamStatus(rawStatus);
                                  // The authorization boolean is the source of
                                  // truth for authorized/unauthorized; the
                                  // exam_status string can be stale. Progress
                                  // statuses (in_progress/completed/…) win.
                                  const isAuthLike =
                                    !canonical ||
                                    canonical === "authorized" ||
                                    canonical === "unauthorized";
                                  const displayKey = isAuthLike
                                    ? isAuth === true
                                      ? "authorized"
                                      : isAuth === false
                                      ? "unauthorized"
                                      : canonical
                                    : canonical;
                                  const startedAt = (cand as any)[
                                    `${opt.value}_started_at`
                                  ];
                                  const endedAt = (cand as any)[
                                    `${opt.value}_ended_at`
                                  ];
                                  return (
                                    <div
                                      key={opt.value}
                                      className="flex flex-col gap-0.5"
                                    >
                                      <span
                                        title={`${opt.label} test`}
                                        className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                          displayKey
                                            ? EXAM_STATUS_META[displayKey]
                                                ?.badge ??
                                              "bg-slate-100 text-slate-600 border-slate-200"
                                            : "bg-slate-50 text-slate-400 border-slate-200"
                                        }`}
                                      >
                                        <span className="font-bold">
                                          {opt.label[0]}
                                        </span>
                                        {displayKey
                                          ? examStatusLabel(displayKey)
                                          : "—"}
                                      </span>
                                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        Start {formatDateTime(startedAt)} · End{" "}
                                        {formatDateTime(endedAt)}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td
                            className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatHeartbeat(cand.last_heartbeat)}
                          </td>
                          <td
                            className="px-5 py-3 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              {canonicalExamStatus(
                                (cand as any)[`${pauseTestType}_exam_status`]
                              ) === "in_progress" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResumeOrPause(cand.id!, true)
                                  }
                                  disabled={pauseLoading[cand.id!]}
                                  title="Pause test"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                >
                                  <FiPause className="h-3.5 w-3.5" />
                                  Pause
                                </button>
                              )}
                              {canonicalExamStatus(
                                (cand as any)[`${pauseTestType}_exam_status`]
                              ) === "paused" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResumeOrPause(cand.id!, false)
                                  }
                                  disabled={pauseLoading[cand.id!]}
                                  title="Resume test"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <FiPlay className="h-3.5 w-3.5" />
                                  Resume
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setResetCandidateId(cand.id!)}
                                disabled={candidatesResetting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                              >
                                <FiRefreshCw className="h-3.5 w-3.5" />
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                  <FiUsers className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                  <h5 className="text-sm font-bold text-slate-950">
                    No Candidates Registered
                  </h5>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Click Add Candidate or Upload Excel to register candidates
                    for this batch.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Candidate bulk delete confirmation */}
      {showCandidateDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10">
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
                {candidateSelectedIds.size} candidate
                {candidateSelectedIds.size > 1 ? "s" : ""}
              </span>{" "}
              from this batch?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCandidateDeleteModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={candidatesDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCandidateDelete}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50"
                disabled={candidatesDeleting}
              >
                {candidatesDeleting ? "Removing…" : "Remove Candidates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate reset confirmation */}
      {resetCandidateId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10">
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
                {batchCandidates.find((c) => c.id === resetCandidateId)
                  ?.enrollment_no || resetCandidateId}
              </span>
              ? This will clear their exam progress.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setResetCandidateId(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={candidatesResetting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetCandidate}
                className="flex-1 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:opacity-50"
                disabled={candidatesResetting}
              >
                {candidatesResetting ? "Resetting…" : "Reset Candidate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark attendance modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <FiUserCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Mark Attendance
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {candidateSelectedIds.size} Candidate
                  {candidateSelectedIds.size > 1 ? "s" : ""} Selected
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Test Type
              </label>
              <select
                value={attendanceTestType}
                disabled={attendanceTestOptions.length === 0}
                onChange={(e) =>
                  setAttendanceTestType(e.target.value as AttendanceTestType)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
              >
                {attendanceTestOptions.length > 0 ? (
                  attendanceTestOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))
                ) : (
                  <option value={attendanceTestType}>No tests available</option>
                )}
              </select>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={isMarkingAttendance}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkAttendance}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                disabled={
                  isMarkingAttendance || attendanceTestOptions.length === 0
                }
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

export default function BatchCandidatesPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <BatchCandidatesInner />
    </Suspense>
  );
}
