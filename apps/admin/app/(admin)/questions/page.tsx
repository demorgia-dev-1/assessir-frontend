"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFileText,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import QuestionForm, { QuestionFormValues } from "@/components/QuestionForm";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  downloadQuestionsTemplate,
  NosSheetInfo,
  parseQuestionsExcelFile,
  ValidationError,
} from "@/lib/questions-import";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Tooltip from "@/components/Tooltip";
import {
  fetchJobRoleById,
  fetchJobRoles,
  JobRoleNos,
} from "@/store/slices/jobroles-slice";
import { fetchSectors } from "@/store/slices/sectors-slice";
import {
  clearError,
  clearSelectedQuestion,
  createQuestions,
  CreateQuestionInput,
  deleteQuestion,
  fetchQuestionById,
  fetchQuestions,
  Question,
  updateQuestion,
} from "@/store/slices/questions-slice";
import {
  buildCreatePayload,
  buildUpdatePayload,
  createEmptyForm,
  normalizeQuestionForm,
  stripHtml,
  validateForm,
} from "./question-utils";

type NosApiShape = JobRoleNos & {
  Code?: string;
  NOSCode?: string;
  NOS_CODE?: string;
  nos_name?: string;
  NOSName?: string;
  NOS_NAME?: string;
  Name?: string;
};

// GET /jobroles/{id} has shipped the job role at a few different keys; accept
// whichever one carries the NOS list.
type JobRoleDetailResponse = {
  nos_list?: NosApiShape[];
  nosList?: NosApiShape[];
  jobrole?: JobRoleDetailResponse;
  jobRole?: JobRoleDetailResponse;
  data?: JobRoleDetailResponse;
};

function getNosCode(nos: NosApiShape) {
  return (
    nos.code ||
    nos.nos_code ||
    nos.Code ||
    nos.NOSCode ||
    nos.NOS_CODE ||
    ""
  );
}

function getNosName(nos: NosApiShape) {
  return nos.name || nos.nos_name || nos.Name || nos.NOSName || nos.NOS_NAME || "";
}

export default function QuestionsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    questions,
    loading,
    creating,
    updating,
    deleting,
    viewLoading,
    selectedQuestion,
    error,
    currentPage,
    totalPages,
    totalQuestions,
    hasNext,
    hasPrev,
  } = useAppSelector((state) => state.questions);
  const { jobRoles } = useAppSelector((state) => state.jobRoles);
  const { sectors } = useAppSelector((state) => state.sectors);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<QuestionFormValues>(
    createEmptyForm()
  );
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);
  const [bulkSectorID, setBulkSectorID] = useState("");
  const [bulkJobRoleID, setBulkJobRoleID] = useState("");
  const [bulkNosList, setBulkNosList] = useState<NosSheetInfo[]>([]);
  const [bulkNosLoading, setBulkNosLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<CreateQuestionInput[]>(
    []
  );
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const selectedBulkJobRole = useMemo(
    () =>
      jobRoles.find((jobRole) => String(jobRole.id) === String(bulkJobRoleID)),
    [bulkJobRoleID, jobRoles]
  );

  // The bulk modal picks a sector first, which narrows the job role dropdown.
  const bulkJobRoleOptions = useMemo(
    () =>
      bulkSectorID
        ? jobRoles.filter(
            (jobRole) => String(jobRole.sector_id) === bulkSectorID
          )
        : [],
    [bulkSectorID, jobRoles]
  );

  useEffect(() => {
    dispatch(fetchQuestions({ page: 1, limit: 10 }));
    dispatch(fetchJobRoles({ page: 1, limit: 1000 }));
    dispatch(fetchSectors({ page: 1, limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(error, { toastId: error });
    dispatch(clearError());
  }, [dispatch, error]);

  // Load the selected job role's NOS list from GET /jobroles/{id}. Both template
  // tabs get one pre-filled row per NOS code, and the code maps back to nos_id
  // on import.
  useEffect(() => {
    if (!bulkJobRoleID) {
      setBulkNosList([]);
      return;
    }

    let active = true;
    setBulkNosLoading(true);
    dispatch(fetchJobRoleById(bulkJobRoleID))
      .unwrap()
      .then((payload: JobRoleDetailResponse | undefined) => {
        const data =
          payload?.jobrole ?? payload?.jobRole ?? payload?.data ?? payload;
        const list: NosApiShape[] =
          data?.nos_list ?? data?.nosList ?? selectedBulkJobRole?.nos_list ?? [];
        if (active) {
          setBulkNosList(
            list
              .filter((nos) => getNosCode(nos))
              .map((nos) => ({
                id: nos.id ?? getNosCode(nos),
                code: String(getNosCode(nos)),
                name: getNosName(nos),
              }))
          );
        }
      })
      .catch(() => {
        if (active) {
          setBulkNosList([]);
        }
      })
      .finally(() => {
        if (active) {
          setBulkNosLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [bulkJobRoleID, dispatch, selectedBulkJobRole?.nos_list]);

  const criticalErrors = useMemo(
    () => validationErrors.filter((item) => item.type === "error"),
    [validationErrors]
  );

  const handlePageChange = (page: number) => {
    dispatch(fetchQuestions({ page, limit: 10 }));
  };

  const refreshQuestions = () => {
    dispatch(fetchQuestions({ page: currentPage, limit: 10 }));
  };

  const handleViewQuestion = (id: string | number) => {
    setViewOpen(true);
    dispatch(fetchQuestionById(id));
  };

  const handleCloseView = () => {
    setViewOpen(false);
    dispatch(clearSelectedQuestion());
  };

  const handleCloseBulk = () => {
    setBulkOpen(false);
    setBulkSectorID("");
    setBulkJobRoleID("");
    setBulkNosList([]);
    setSelectedFile(null);
    setParsedQuestions([]);
    setValidationErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenEditModal = (question: Question) => {
    setQuestionToEdit(question);
    setEditForm(normalizeQuestionForm(question));
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setQuestionToEdit(null);
    setEditForm(createEmptyForm());
  };

  const handleUpdateQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!questionToEdit) {
      return;
    }

    const validationMessage = validateForm(editForm);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const resultAction = await dispatch(
      updateQuestion(buildUpdatePayload(questionToEdit.id, editForm))
    );

    if (updateQuestion.fulfilled.match(resultAction)) {
      toast.success("Question updated successfully.");
      handleCloseEditModal();
      refreshQuestions();
      if (viewOpen) {
        dispatch(fetchQuestionById(questionToEdit.id));
      }
    }
  };

  const handleDeleteQuestionClick = (question: Question) => {
    setQuestionToDelete(question);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setQuestionToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete) {
      return;
    }

    const resultAction = await dispatch(deleteQuestion(questionToDelete.id));
    if (deleteQuestion.fulfilled.match(resultAction)) {
      toast.success("Question deleted successfully.");
      handleCloseDeleteModal();
      refreshQuestions();
      if (selectedQuestion?.id === questionToDelete.id) {
        handleCloseView();
      }
    }
  };

  const processFile = (file: File) => {
    if (!bulkJobRoleID) {
      toast.error("Please select a job role before uploading questions.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isXlsx =
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".xlsx");

    if (!isXlsx) {
      toast.error("Please upload a valid Excel file (.xlsx)");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const arrayBuffer = loadEvent.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        toast.error("Failed to read the file.");
        return;
      }

      const result = parseQuestionsExcelFile(arrayBuffer, bulkNosList);
      setParsedQuestions(result.questions.map((question) => ({ ...question })));
      setValidationErrors(result.errors);
    };
    reader.onerror = () => toast.error("Failed to read the file.");
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = async () => {
    if (!bulkJobRoleID) {
      toast.error("Please select a job role before downloading the template.");
      return;
    }
    if (!bulkNosList.length) {
      toast.error("The selected job role has no NOS to build a template.");
      return;
    }
    try {
      await downloadQuestionsTemplate(
        bulkNosList,
        selectedBulkJobRole?.name || `Job Role ${bulkJobRoleID}`
      );
    } catch {
      toast.error("Failed to generate the template.");
    }
  };

  const handleBulkJobRoleChange = (jobRoleId: string) => {
    setBulkJobRoleID(jobRoleId);
    setSelectedFile(null);
    setParsedQuestions([]);
    setValidationErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBulkSectorChange = (sectorId: string) => {
    setBulkSectorID(sectorId);
    handleBulkJobRoleChange("");
  };

  const handleBulkImport = async () => {
    if (!bulkJobRoleID) {
      toast.error("Please select a job role before importing questions.");
      return;
    }

    if (!parsedQuestions.length) {
      toast.error("Please upload a valid Excel file first.");
      return;
    }

    if (criticalErrors.length) {
      toast.error("Please fix Excel validation errors before importing.");
      return;
    }

    const resultAction = await dispatch(createQuestions(parsedQuestions));
    if (createQuestions.fulfilled.match(resultAction)) {
      toast.success(
        `${parsedQuestions.length} questions imported successfully.`
      );
      setSelectedFile(null);
      setParsedQuestions([]);
      setValidationErrors([]);
      setBulkOpen(false);
      refreshQuestions();
    }
  };

  const selectedQuestionMetadata =
    selectedQuestion && typeof selectedQuestion.metadata !== "string"
      ? selectedQuestion.metadata
      : null;

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6 xl:h-full xl:min-h-0">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-5 shadow-soft shadow-slate-900/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Assessment Content
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
              Questions
            </h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-950">
              {totalQuestions}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Registered Questions
            </p>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.25fr_420px]">
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  {/* <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ID
                  </th> */}
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Question
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    NOS
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Difficulty
                  </th>

                  <th className="px-6 py-5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      {/* <td className="px-6 py-5">
                        <div className="h-4 w-8 rounded bg-slate-100" />
                      </td> */}
                      <td className="px-6 py-5">
                        <div className="h-4 w-16 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-20 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-16 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-44 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="ml-auto h-4 w-20 rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : questions.length ? (
                  questions.map((question) => (
                    <tr
                      key={question.id}
                      className="group transition-colors hover:bg-slate-50/50"
                    >
                      {/* <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        {question.id}
                      </td> */}
                      <td className="px-6 py-5 text-sm text-slate-700">
                        <p className="max-w-[320px] truncate">
                          {stripHtml(question.text)}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          {question.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {question.nos?.code ||
                          question.nos?.nos_code ||
                          question.nos?.name ||
                          `NOS ${question.nosID}`}
                      </td>
                      <td className="px-6 py-5 text-sm capitalize text-slate-600">
                        {question.difficultyLvl}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <Tooltip label="View Question">
                            <button
                              onClick={() => handleViewQuestion(question.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              <FiEye className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Edit Question">
                            <button
                              onClick={() => handleOpenEditModal(question)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              <FiEdit2 className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Delete Question">
                            <button
                              onClick={() =>
                                handleDeleteQuestionClick(question)
                              }
                              disabled={deleting}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center text-sm text-slate-500"
                    >
                      No questions found. Create a single question or import
                      them in bulk to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-5">
            <div className="flex flex-col">
              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-semibold text-slate-950">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-950">
                  {totalPages}
                </span>
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                Total {totalQuestions} records
              </p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!hasPrev || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Actions */}
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-sm font-bold text-slate-950">
              Question Actions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Add a new question or bulk import from Excel.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push("/questions/create")}
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <FiPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Add Question
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Create a single question with the rich editor.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <FiUploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Bulk Upload
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Import multiple questions from an .xlsx file.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* end grid */}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Bulk Import Questions
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pick a sector and job role, then download its template. The
                  workbook has one MCQ sheet and one Rubric sheet with all NOS
                  rows listed. Fill the question columns next to the correct
                  `Nos Code` and upload to import.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseBulk}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Sector
              </label>
              <SearchableSelect
                value={bulkSectorID}
                onChange={handleBulkSectorChange}
                placeholder="Select a sector"
                searchPlaceholder="Search sectors…"
                options={[
                  { value: "", label: "Select a sector" },
                  ...sectors.map((sector) => ({
                    value: String(sector.id),
                    label: sector.name,
                  })),
                ]}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Job Role For Imported Questions
              </label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={bulkJobRoleID}
                    onChange={handleBulkJobRoleChange}
                    disabled={!bulkSectorID}
                    placeholder={
                      bulkSectorID
                        ? "Select a job role"
                        : "Select a sector first"
                    }
                    searchPlaceholder="Search job roles…"
                    options={[
                      { value: "", label: "Select a job role" },
                      ...bulkJobRoleOptions.map((jobRole) => ({
                        value: String(jobRole.id),
                        label: jobRole.name || `Job Role ${jobRole.id}`,
                      })),
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={
                    !bulkJobRoleID || bulkNosLoading || !bulkNosList.length
                  }
                  className="mr-1 inline-flex shrink-0 items-center rounded-2xl border border-slate-200 bg-white px-2 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiDownload className="mr-2 h-4 w-4" />
                  Template
                </button>
              </div>
              {bulkSectorID && !bulkJobRoleOptions.length && (
                <p className="ml-1 text-[11px] text-slate-500">
                  No job roles found for this sector.
                </p>
              )}
              {bulkJobRoleID && (
                <p className="ml-1 text-[11px] text-slate-500">
                  {bulkNosLoading
                    ? "Loading NOS..."
                    : bulkNosList.length
                    ? `2 sheets with ${bulkNosList.length} NOS: ${bulkNosList
                        .map((nos) => nos.code)
                        .join(", ")}`
                    : "No NOS found for this job role."}
                </p>
              )}
            </div>

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) {
                  processFile(file);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center transition ${
                dragActive
                  ? "border-slate-800 bg-slate-50/50"
                  : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) processFile(file);
                  event.target.value = "";
                }}
              />

              <div className="flex h-15 w-15 items-center justify-center rounded-[1.5rem] bg-slate-50 text-slate-500 shadow-sm">
                <FiUploadCloud className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-950">
                Drag and drop your Excel sheet here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                or click to browse for a `.xlsx` file
              </p>
              {selectedFile && (
                <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {selectedFile.name}
                </span>
              )}
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                  <FiFileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Import Summary
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Parsed records:{" "}
                    <span className="font-semibold">
                      {parsedQuestions.length}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Validation errors:{" "}
                    <span className="font-semibold">
                      {criticalErrors.length}
                    </span>
                  </p>
                </div>
              </div>

              {!!validationErrors.length && (
                <div className="mt-4 space-y-2">
                  {validationErrors.map((item, index) => (
                    <div
                      key={`${item.message}-${index}`}
                      className={`rounded-2xl border px-4 py-3 text-xs ${
                        item.type === "error"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.message}
                    </div>
                  ))}
                </div>
              )}

              {/* {!!parsedQuestions.length && (
                  <div className="mt-4 space-y-3">
                    {parsedQuestions.slice(0, 3).map((question, index) => (
                      <div
                        key={`${question.text}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {question.type}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {question.difficulty_lvl}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            NOS {question.nos_id}
                          </span>
                        </div>
                     <p className="mt-3 text-sm font-semibold text-slate-900">
                          {stripHtml(question.text)}
                        </p>
                      </div>
                    ))}
                    {parsedQuestions.length > 3 && (
                      <p className="text-xs text-slate-500">
                        Showing 3 of {parsedQuestions.length} parsed questions.
                      </p>
                    )}
                  </div>
                )} */}
            </div>

            <button
              type="button"
              onClick={handleBulkImport}
              disabled={
                creating || !parsedQuestions.length || !!criticalErrors.length
              }
              className="mt-6 w-full rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Importing..." : "Import Questions"}
            </button>
          </div>
        </div>
      )}

      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white p-7 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Question Details
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Review the selected question, including its stored metadata.
                </p>
              </div>
              <button
                onClick={handleCloseView}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="mt-8 space-y-4 animate-pulse">
                <div className="h-14 rounded-2xl bg-slate-100" />
                <div className="h-28 rounded-2xl bg-slate-100" />
                <div className="h-20 rounded-2xl bg-slate-100" />
              </div>
            ) : selectedQuestion ? (
              <div className="mt-6 space-y-5">
                {/* <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Question ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      #{selectedQuestion.id}
                    </p>
                  </div> */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Text
                  </p>
                  <div
                    className="prose prose-sm mt-3 max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{
                      __html: selectedQuestion.text,
                    }}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Type
                    </p>
                    <p className="mt-1 text-sm font-semibold uppercase text-slate-950">
                      {selectedQuestion.type}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Difficulty
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-slate-950">
                      {selectedQuestion.difficultyLvl}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    NOS
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {selectedQuestion.nos?.code ||
                      selectedQuestion.nos?.nos_code ||
                      selectedQuestion.nos?.name ||
                      `NOS ${selectedQuestion.nosID}`}
                  </p>
                </div>

                {selectedQuestion.type === "mcq" &&
                  selectedQuestionMetadata?.options && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Options
                      </p>
                      <div className="mt-3 space-y-2">
                        {selectedQuestionMetadata.options.map(
                          (option, index) => (
                            <div
                              key={`${option.text}-${index}`}
                              className={`rounded-xl border px-4 py-3 text-sm ${
                                option.is_correct
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: option.text,
                                }}
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {selectedQuestion.type === "rubric" &&
                  selectedQuestionMetadata?.expected_answer && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Expected Answer
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {selectedQuestionMetadata.expected_answer}
                      </p>
                    </div>
                  )}

                {selectedQuestion.type === "rubric" &&
                  selectedQuestionMetadata?.scores && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Rubric Scores
                      </p>
                      <div className="mt-3 space-y-2">
                        {selectedQuestionMetadata.scores.map((score, index) => (
                          <div
                            key={`${score.label}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <span>{score.label}</span>
                            <span className="font-semibold text-slate-950">
                              {score.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-slate-500">
                Unable to load question details.
              </p>
            )}
          </div>
        </div>
      )}

      {editModalOpen && questionToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 transition-all duration-200 will-change-[opacity]">
          <div className="h-[90vh] w-full max-w-5xl flex flex-col rounded-[2rem] overflow-hidden relative shadow-2xl transform translate-z-0 will-change-[transform,opacity]">
            <QuestionForm
              title="Edit Question"
              description="Update question content, metadata, and formatting before saving."
              jobRoles={jobRoles}
              value={editForm}
              questionId={questionToEdit.id}
              onChange={setEditForm}
              onSubmit={handleUpdateQuestion}
              submitLabel="Save Changes"
              submitting={updating}
            />
            <button
              onClick={handleCloseEditModal}
              className="fixed right-8 top-8 rounded-full bg-white p-3 text-slate-500 shadow-lg transition hover:text-slate-950"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {deleteModalOpen && questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 transition-all duration-200 will-change-[opacity]">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10 shadow-2xl transform translate-z-0 will-change-[transform,opacity]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <FiAlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Confirm Deletion
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Action is Permanent
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Are you sure you want to delete this question?
            </p>
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
              {stripHtml(questionToDelete.text) ||
                `Question #${questionToDelete.id}`}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
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
                {deleting ? "Deleting..." : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
