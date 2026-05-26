"use client";

import React, { useState, useRef } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  createJobRolesBulk,
  fetchJobRoles,
} from "@/store/slices/jobroles-slice";
import { toast } from "react-toastify";
import {
  FiUploadCloud,
  FiDownload,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiFileText,
  FiCheck,
  FiLayers,
} from "react-icons/fi";
import {
  downloadTemplate,
  parseExcelFile,
  ParsedJobRole,
  ValidationError,
} from "@/lib/job-roles-import";

interface ImportJobRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectorId: number;
  sectorName: string;
}

export default function ImportJobRolesModal({
  isOpen,
  onClose,
  sectorId,
  sectorName,
}: ImportJobRolesModalProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedJobRoles, setParsedJobRoles] = useState<ParsedJobRole[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [step, setStep] = useState<"upload" | "preview" | "success">("upload");
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);

  // Toggle state to preview details in the preview step
  const [expandedRoleIndex, setExpandedRoleIndex] = useState<number | null>(
    null
  );

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
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
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        const { jobRoles, errors } = parseExcelFile(arrayBuffer);
        setParsedJobRoles(jobRoles);
        setValidationErrors(errors);
        setStep("preview");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleConfirmImport = async () => {
    if (validationErrors.some((e) => e.type === "error")) {
      toast.error("Please fix critical validation errors before importing.");
      return;
    }

    setImporting(true);
    // Format parsed Job Roles to match backend payload structure
    const payload = parsedJobRoles.map((jr) => ({
      name: jr.name,
      code: jr.code,
      sector_id: sectorId,
      total_theory_marks: jr.total_theory_marks,
      total_practical_marks: jr.total_practical_marks,
      total_viva_marks: jr.total_viva_marks,
      nos_list: jr.nos_list.map((nos) => ({
        name: nos.name,
        code: nos.code,
        total_theory_marks: nos.total_theory_marks,
        total_practical_marks: nos.total_practical_marks,
        total_viva_marks: nos.total_viva_marks,
        ...(nos.pc_list.length > 0
          ? {
              pc_list: nos.pc_list.map((pc) => ({
                name: pc.name,
                code: pc.code,
                total_theory_marks: pc.total_theory_marks,
                total_practical_marks: pc.total_practical_marks,
                total_viva_marks: pc.total_viva_marks,
              })),
            }
          : {}),
      })),
    }));

    const resultAction = await dispatch(createJobRolesBulk(payload));
    setImporting(false);

    if (createJobRolesBulk.fulfilled.match(resultAction)) {
      setImportCount(parsedJobRoles.length);
      setStep("success");
      dispatch(fetchJobRoles({ page: 1, limit: 10 }));
      toast.success("Job roles successfully imported!");
    } else {
      const errMsg =
        (resultAction.payload as string) || "Failed to import job roles";
      toast.error(errMsg);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedJobRoles([]);
    setValidationErrors([]);
    setStep("upload");
    setExpandedRoleIndex(null);
  };

  const hasCriticalErrors = validationErrors.some((e) => e.type === "error");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-3xl rounded-[2.5rem] border border-white/80 p-8 shadow-soft shadow-slate-900/10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
              <FiLayers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Bulk Import Job Roles
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload Excel sheets containing full operational hierarchies.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-slate-400 hover:text-slate-950 transition p-1.5 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            <FiX className="h-5 w-5" />
          </button>
        </header>

        {/* Scrollable Content Zone */}
        <div className="flex-1 overflow-y-auto py-6 px-1">
          {step === "upload" && (
            <div className="flex flex-col gap-6">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] p-10 cursor-pointer transition-all duration-300 ${
                  dragActive
                    ? "border-slate-800 bg-slate-50/50 scale-[0.99]"
                    : "border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-50 border border-slate-100 text-slate-500 shadow-sm mb-4">
                  <FiUploadCloud className="h-7 w-7" />
                </div>
                <p className="text-sm font-bold text-slate-950 text-center">
                  Drag and drop your Excel sheet here
                </p>
                <p className="text-xs text-slate-500 mt-1 text-center">
                  or click to browse from your computer
                </p>
                <span className="mt-6 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-250">
                  Supported format: .xlsx
                </span>
              </div>

              {/* Template Download Section */}
              <div className="rounded-[2rem] bg-slate-50 p-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-500">
                    <FiFileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">
                      Don't have the template yet?
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                      Download the single Excel template based on the workbook
                      structure you provided.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-250 bg-white px-4 py-3 text-xs font-bold text-slate-800 transition hover:bg-slate-50 active:scale-[0.98] shadow-sm"
                  >
                    <FiDownload className="h-4 w-4" /> Download Template
                  </button>
                </div>
              </div>

              {/* Schema Specifications Box */}
              <div className="rounded-[2rem] bg-white border border-slate-100 p-6 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3.5">
                  Excel Format Rules & Constraints
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>
                      Use the workbook sheets exactly as provided:{" "}
                      <strong>Jobrole</strong>, <strong>Nos</strong>, and
                      optional <strong>Pc</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>
                      <strong>Sector</strong> is pre-selected from the sidebar —
                      no need to include it in the Excel file.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>
                      If the <strong>Pc</strong> sheet is removed, or PC fields
                      are left blank, PCs will be ignored and not sent in the
                      import payload.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                    <span>
                      <strong>Strict Marks Check:</strong> NOS totals must
                      exactly equal the parent Job Role totals. For the full
                      template, PC totals must also exactly equal the parent NOS
                      totals.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col gap-6">
              {/* File Info */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <FiFileText className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-950">
                      {file?.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(file!.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Change File
                </button>
              </div>

              {/* Validation Feedback Banner */}
              {validationErrors.length > 0 ? (
                <div
                  className={`rounded-2xl p-4 border ${
                    hasCriticalErrors
                      ? "bg-red-50/50 border-red-200/80 text-red-800"
                      : "bg-amber-50/50 border-amber-200/80 text-amber-800"
                  }`}
                >
                  <div className="flex gap-3">
                    <FiAlertTriangle
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        hasCriticalErrors ? "text-red-500" : "text-amber-500"
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold">
                        {hasCriticalErrors
                          ? "Critical Validation Errors Found"
                          : "Validation Warnings Issued"}
                      </h4>
                      <p className="text-xs opacity-90 mt-0.5">
                        {hasCriticalErrors
                          ? "You must correct the errors in your Excel file and re-upload before you can proceed."
                          : "You can import but please review the warnings regarding duplicate records."}
                      </p>
                      <div className="mt-3 max-h-[160px] overflow-y-auto space-y-1.5 text-xs border-t border-slate-900/5 pt-3">
                        {validationErrors.map((err, i) => (
                          <div
                            key={i}
                            className="flex gap-2 items-start font-semibold"
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                                err.type === "error"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            <span>
                              {err.message}{" "}
                              {err.details && (
                                <span className="font-normal opacity-85">
                                  ({err.details})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50/50 border border-emerald-250 p-4 text-emerald-800 flex gap-3">
                  <FiCheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold">Validation Succeeded!</h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      All row formats, sector mappings, duplicate rules, and
                      marks validations are 100% correct and ready for database
                      registration.
                    </p>
                  </div>
                </div>
              )}

              {/* Parsed Structure Preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3 ml-1">
                  Preview Job Roles to Import ({parsedJobRoles.length})
                </h3>

                <div className="space-y-4">
                  {parsedJobRoles.map((jr, jrIdx) => {
                    const isExpanded = expandedRoleIndex === jrIdx;
                    return (
                      <div
                        key={jr.code}
                        className="rounded-[1.5rem] bg-white border border-slate-100 overflow-hidden shadow-sm transition hover:shadow-soft"
                      >
                        {/* Job Role Row */}
                        <div
                          onClick={() =>
                            setExpandedRoleIndex(isExpanded ? null : jrIdx)
                          }
                          className="flex items-center justify-between p-5 cursor-pointer bg-slate-50/30 hover:bg-slate-50/70 transition-colors"
                        >
                          <div>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200">
                              Sector: {sectorName}
                            </span>
                            <h4 className="text-sm font-bold text-slate-950 mt-1">
                              {jr.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Code: {jr.code}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                                Marks (T/P/V)
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {jr.total_theory_marks} /{" "}
                                {jr.total_practical_marks} /{" "}
                                {jr.total_viva_marks}
                              </span>
                            </div>
                            <span className="text-slate-400 text-xs font-bold select-none px-2 py-1 rounded bg-white border border-slate-150 shadow-sm">
                              {isExpanded ? "Hide Details" : "View Details"}
                            </span>
                          </div>
                        </div>

                        {/* Expanded NOS and PC List */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 p-5 bg-white space-y-4">
                            {jr.nos_list.map((nos) => (
                              <div
                                key={nos.code}
                                className="rounded-xl border border-slate-100 p-4 bg-slate-50/20"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-900">
                                      NOS: {nos.name}
                                    </h5>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                      Code: {nos.code}
                                    </p>
                                  </div>
                                  <div className="text-right text-[10px]">
                                    <span className="font-bold text-slate-500">
                                      NOS Marks:{" "}
                                    </span>
                                    <span className="font-bold text-slate-900">
                                      {nos.total_theory_marks} /{" "}
                                      {nos.total_practical_marks} /{" "}
                                      {nos.total_viva_marks}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {nos.pc_list.map((pc) => (
                                    <div
                                      key={pc.code}
                                      className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] font-medium"
                                    >
                                      <div>
                                        <p className="text-slate-800 font-semibold">
                                          {pc.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400">
                                          PC Code: {pc.code}
                                        </p>
                                      </div>
                                      <div className="text-[10px] font-bold text-slate-700">
                                        {pc.total_theory_marks} /{" "}
                                        {pc.total_practical_marks} /{" "}
                                        {pc.total_viva_marks}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-300">
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-emerald-50 text-emerald-500 shadow-md shadow-emerald-500/10 border border-emerald-150 mb-6">
                <FiCheck className="h-10 w-10 animate-in slide-in-from-bottom-2 duration-500" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-950">
                Registration Complete!
              </h3>
              <p className="text-sm text-slate-500 font-medium text-center max-w-sm mt-2 leading-relaxed">
                Successfully uploaded and created{" "}
                <strong className="text-slate-950">{importCount}</strong> new
                Job Roles along with all their operational standard parameters.
              </p>

              <div className="mt-8 flex gap-3.5">
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98]"
                >
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-slate-950 px-6 py-3 text-xs font-bold text-white shadow-md shadow-slate-950/20 hover:opacity-90 transition active:scale-[0.98]"
                >
                  Close Panel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <footer className="border-t border-slate-100 pt-5 flex justify-between gap-3">
            <button
              onClick={handleReset}
              disabled={importing}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importing || hasCriticalErrors}
              className="rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/20 hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2"
            >
              {importing
                ? "Importing Records..."
                : "Confirm & Import Job Roles"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
