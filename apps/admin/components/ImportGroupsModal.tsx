"use client";

import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiLayers,
  FiUploadCloud,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useAppDispatch } from "@/store/hooks";
import { createGroups, fetchGroups } from "@/store/slices/groups-slice";
import {
  downloadGroupsTemplate,
  GroupValidationError,
  parseGroupsExcelFile,
} from "@/lib/groups-import";

interface ImportGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportGroupsModal({
  isOpen,
  onClose,
}: ImportGroupsModalProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "success">("upload");
  const [validationErrors, setValidationErrors] = useState<GroupValidationError[]>(
    []
  );
  const [parsedGroups, setParsedGroups] = useState<
    { name: string; candidates: { enrollment_no: string; password: string }[] }[]
  >([]);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);

  if (!isOpen) return null;

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    const isXlsx =
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.name.endsWith(".xlsx");

    if (!isXlsx) {
      toast.error("Please upload a valid Excel file (.xlsx)");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;

      const result = parseGroupsExcelFile(arrayBuffer);
      setParsedGroups(result.groups);
      setValidationErrors(result.errors);
      setStep("preview");
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files?.[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      processFile(event.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStep("upload");
    setParsedGroups([]);
    setValidationErrors([]);
    setImportCount(0);
  };

  const handleClose = () => {
    if (importing) return;
    handleReset();
    onClose();
  };

  const handleConfirmImport = async () => {
    if (validationErrors.some((error) => error.type === "error")) {
      toast.error("Please fix the Excel errors before importing.");
      return;
    }

    setImporting(true);
    const resultAction = await dispatch(createGroups({ groups: parsedGroups }));
    setImporting(false);

    if (createGroups.fulfilled.match(resultAction)) {
      setImportCount(parsedGroups.length);
      setStep("success");
      dispatch(fetchGroups({ page: 1, limit: 10 }));
      toast.success("Groups imported successfully.");
      return;
    }

    toast.error((resultAction.payload as string) || "Failed to import groups");
  };

  const hasCriticalErrors = validationErrors.some((error) => error.type === "error");
  const candidateCount = parsedGroups.reduce(
    (sum, group) => sum + group.candidates.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay animate-in fade-in duration-300">
      <div className="glass-panel flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] border border-white/80 p-8 shadow-soft shadow-slate-900/10 animate-in zoom-in-95 duration-200">
        <header className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
              <FiLayers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Bulk Import Groups
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Upload Excel rows of groups and candidate credentials.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
          >
            <FiX className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-1 py-6">
          {step === "upload" && (
            <div className="flex flex-col gap-6">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-10 transition-all duration-300 ${
                  dragActive
                    ? "scale-[0.99] border-slate-800 bg-slate-50/50"
                    : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-slate-100 bg-slate-50 text-slate-500 shadow-sm">
                  <FiUploadCloud className="h-7 w-7" />
                </div>
                <p className="text-center text-sm font-bold text-slate-950">
                  Drag and drop your groups Excel file here
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  or click to browse from your computer
                </p>
                <span className="mt-6 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Supported format: .xlsx
                </span>
              </div>

              <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500">
                    <FiFileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">
                      Need the template first?
                    </h4>
                    <p className="mt-0.5 max-w-md text-xs text-slate-500">
                      Download the ready-made sheet, fill group rows, then upload it back here.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadGroupsTemplate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50 shadow-sm"
                >
                  <FiDownload className="h-4 w-4" />
                  Download Template
                </button>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                <h4 className="mb-3.5 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  Excel Format Rules
                </h4>
                <ul className="space-y-2.5 text-xs font-medium text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>Use one sheet named <strong>Groups</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>Repeat the same group name on multiple rows to add more candidates to that group.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>Required columns: <strong>GROUP NAME</strong>, <strong>ENROLLMENT NO</strong>, <strong>PASSWORD</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>Duplicate enrollment numbers inside the same group are skipped with a warning.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <FiFileText className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-950">{file?.name}</p>
                    <p className="text-[10px] text-slate-500">{file ? `${(file.size / 1024).toFixed(1)} KB` : ""}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Change File
                </button>
              </div>

              {validationErrors.length > 0 ? (
                <div
                  className={`rounded-2xl border p-4 ${
                    hasCriticalErrors
                      ? "border-red-200/80 bg-red-50/50 text-red-800"
                      : "border-amber-200/80 bg-amber-50/50 text-amber-800"
                  }`}
                >
                  <div className="flex gap-3">
                    <FiAlertTriangle
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        hasCriticalErrors ? "text-red-500" : "text-amber-500"
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold">
                        {hasCriticalErrors ? "Validation Errors Found" : "Validation Warnings Found"}
                      </h4>
                      <div className="mt-3 max-h-[160px] space-y-1.5 overflow-y-auto border-t border-slate-900/5 pt-3 text-xs">
                        {validationErrors.map((error, index) => (
                          <div key={index} className="flex items-start gap-2 font-semibold">
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                                error.type === "error" ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            <span>
                              {error.message}{" "}
                              {error.details ? (
                                <span className="font-normal opacity-85">({error.details})</span>
                              ) : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-800">
                  <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-bold">Validation succeeded</h4>
                    <p className="mt-0.5 text-xs opacity-90">
                      The sheet is ready to import into your Groups directory.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Groups</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{parsedGroups.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Candidates</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{candidateCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">
                    {hasCriticalErrors ? "Needs fixes" : "Ready to import"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 ml-1 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  Preview Groups ({parsedGroups.length})
                </h3>
                <div className="space-y-4">
                  {parsedGroups.map((group) => (
                    <div
                      key={group.name}
                      className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between bg-slate-50/30 p-5">
                        <div>
                          <h4 className="text-sm font-bold text-slate-950">{group.name}</h4>
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            {group.candidates.length} candidates
                          </p>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Group
                        </div>
                      </div>
                      <div className="space-y-2 border-t border-slate-100 p-4">
                        {group.candidates.map((candidate, index) => (
                          <div
                            key={`${group.name}-${candidate.enrollment_no}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/20 p-3 text-[11px]"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {candidate.enrollment_no}
                              </p>
                              <p className="text-slate-400">Password: {candidate.password}</p>
                            </div>
                            <FiUsers className="h-4 w-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex animate-in zoom-in-95 flex-col items-center justify-center py-10 duration-300">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-emerald-200 bg-emerald-50 text-emerald-500 shadow-md shadow-emerald-500/10">
                <FiCheck className="h-10 w-10 animate-in slide-in-from-bottom-2 duration-500" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-950">
                Import Complete
              </h3>
              <p className="mt-2 max-w-md text-center text-sm text-slate-500">
                Added {importCount} groups from your Excel file.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          {step !== "success" ? (
            <>
              <button
                onClick={handleClose}
                disabled={importing}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Cancel
              </button>
              {step === "preview" && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || hasCriticalErrors || parsedGroups.length === 0}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importing ? "Importing..." : "Import Groups"}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleClose}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
