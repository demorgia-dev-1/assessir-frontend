"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFileText,
  FiLayers,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import QuestionForm, { QuestionFormValues } from "@/components/QuestionForm";
import {
  downloadQuestionsTemplate,
  parseQuestionsExcelFile,
  ValidationError,
} from "@/lib/questions-import";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTopics } from "@/store/slices/topics-slice";
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

const DEFAULT_OPTIONS = [
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
];

const DEFAULT_SCORES = [
  { label: "excellent", percentage: 100 },
  { label: "very_good", percentage: 80 },
  { label: "good", percentage: 60 },
  { label: "poor", percentage: 30 },
  { label: "very_poor", percentage: 0 },
];

function createEmptyForm(): QuestionFormValues {
  return {
    text: "",
    type: "mcq",
    difficultyLvl: "easy",
    topicID: "",
    metadata: {
      options: DEFAULT_OPTIONS.map((option) => ({ ...option })),
      scores: DEFAULT_SCORES.map((score) => ({ ...score })),
    },
  };
}

function stripHtml(html: string) {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || container.innerText || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestionForm(question: Question): QuestionFormValues {
  const metadata =
    typeof question.metadata === "string"
      ? { options: DEFAULT_OPTIONS, scores: DEFAULT_SCORES }
      : question.metadata || {};

  return {
    text: question.text,
    type: question.type,
    difficultyLvl: question.difficultyLvl,
    topicID: String(question.topicID),
    metadata: {
      options:
        metadata.options?.length
          ? metadata.options.map((option) => ({ ...option }))
          : DEFAULT_OPTIONS.map((option) => ({ ...option })),
      scores:
        metadata.scores?.length
          ? metadata.scores.map((score) => ({ ...score }))
          : DEFAULT_SCORES.map((score) => ({ ...score })),
    },
  };
}

function buildCreatePayload(values: QuestionFormValues) {
  return {
    text: values.text.trim(),
    type: values.type,
    difficulty_lvl: values.difficultyLvl,
    topic_id: Number(values.topicID),
    metadata:
      values.type === "mcq"
        ? {
            options: values.metadata.options
              .filter((option) => stripHtml(option.text))
              .map((option) => ({
                text: option.text.trim(),
                is_correct: option.is_correct,
              })),
          }
        : {
            scores: values.metadata.scores
              .filter((score) => score.label.trim())
              .map((score) => ({
                label: score.label.trim(),
                percentage: Number(score.percentage),
              })),
          },
  };
}

function buildUpdatePayload(id: string | number, values: QuestionFormValues) {
  const createPayload = buildCreatePayload(values);
  return {
    id,
    text: createPayload.text,
    type: createPayload.type,
    difficultyLvl: values.difficultyLvl,
    topicID: Number(values.topicID),
    metadata: createPayload.metadata,
  };
}

function validateForm(values: QuestionFormValues) {
  if (!stripHtml(values.text)) {
    return "Question text is required.";
  }

  if (!values.topicID) {
    return "Please select a topic.";
  }

  if (values.type === "mcq") {
    const validOptions = values.metadata.options.filter((option) =>
      stripHtml(option.text)
    );
    const correctCount = validOptions.filter((option) => option.is_correct).length;

    if (validOptions.length < 2) {
      return "MCQ questions need at least 2 options.";
    }

    if (correctCount !== 1) {
      return "MCQ questions need exactly 1 correct option.";
    }

    return null;
  }

  const validScores = values.metadata.scores.filter((score) => score.label.trim());
  if (validScores.length < 2) {
    return "Rubric questions need at least 2 score rows.";
  }

  const invalidScore = validScores.find(
    (score) =>
      !Number.isFinite(Number(score.percentage)) ||
      Number(score.percentage) < 0 ||
      Number(score.percentage) > 100
  );

  if (invalidScore) {
    return "Rubric percentages must be between 0 and 100.";
  }

  return null;
}

export default function QuestionsPage() {
  const dispatch = useAppDispatch();
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
  const { topics } = useAppSelector((state) => state.topics);

  const [panelMode, setPanelMode] = useState<"bulk" | "view">("bulk");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForms, setCreateForms] = useState<QuestionFormValues[]>([
    createEmptyForm(),
  ]);
  const [activeCreateIndex, setActiveCreateIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<QuestionFormValues>(createEmptyForm());
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [bulkTopicID, setBulkTopicID] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<CreateQuestionInput[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    dispatch(fetchQuestions({ page: 1, limit: 10 }));
    dispatch(fetchTopics({ page: 1, limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(error);
    dispatch(clearError());
  }, [dispatch, error]);

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

  const activeCreateForm = createForms[activeCreateIndex] || createEmptyForm();

  const updateActiveCreateForm = (nextValue: QuestionFormValues) => {
    setCreateForms((current) =>
      current.map((form, index) =>
        index === activeCreateIndex ? nextValue : form
      )
    );
  };

  const handleOpenCreateModal = () => {
    setCreateForms([createEmptyForm()]);
    setActiveCreateIndex(0);
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setCreateForms([createEmptyForm()]);
    setActiveCreateIndex(0);
  };

  const handleAddMoreQuestion = () => {
    setCreateForms((current) => [...current, createEmptyForm()]);
    setActiveCreateIndex(createForms.length);
  };

  const handleCreateQuestion = async (event: FormEvent) => {
    event.preventDefault();
    for (let index = 0; index < createForms.length; index += 1) {
      const validationMessage = validateForm(createForms[index]);
      if (validationMessage) {
        setActiveCreateIndex(index);
        toast.error(`Question ${index + 1}: ${validationMessage}`);
        return;
      }
    }

    const resultAction = await dispatch(createQuestions(createForms.map(buildCreatePayload)));

    if (createQuestions.fulfilled.match(resultAction)) {
      toast.success(
        `${createForms.length} question${createForms.length > 1 ? "s" : ""} created successfully.`
      );
      handleCloseCreateModal();
      refreshQuestions();
    }
  };

  const handleViewQuestion = (id: string | number) => {
    setPanelMode("view");
    dispatch(fetchQuestionById(id));
  };

  const handleCloseView = () => {
    setPanelMode("bulk");
    dispatch(clearSelectedQuestion());
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
      if (panelMode === "view") {
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
   if (!bulkTopicID) {
  toast.error("Please select a topic before uploading questions.");
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

      const result = parseQuestionsExcelFile(arrayBuffer, Number(bulkTopicID));
      setParsedQuestions(result.questions.map((question) => ({ ...question })));
      setValidationErrors(result.errors);
    };
    reader.onerror = () => toast.error("Failed to read the file.");
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    if (!bulkTopicID) {
      toast.error("Please select a topic before importing questions.");
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
      toast.success(`${parsedQuestions.length} questions imported successfully.`);
      setSelectedFile(null);
      setParsedQuestions([]);
      setValidationErrors([]);
      setPanelMode("bulk");
      refreshQuestions();
    }
  };

  const selectedQuestionMetadata =
    selectedQuestion && typeof selectedQuestion.metadata !== "string"
      ? selectedQuestion.metadata
      : null;

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Assessment Content
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Questions
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-950">{totalQuestions}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Registered Questions
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_420px]">
        <div className="glass-panel flex flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ID
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Topic
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Difficulty
                  </th>
                  <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Question
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
                      <td className="px-6 py-5">
                        <div className="h-4 w-8 rounded bg-slate-100" />
                      </td>
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
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        #{question.id}
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          {question.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {question.topic?.name ||
                          topics.find(
                            (topic) =>
                              String(topic.id) === String(question.topicID)
                          )?.name ||
                          `Topic ${question.topicID}`}
                      </td>
                      <td className="px-6 py-5 text-sm capitalize text-slate-600">
                        {question.difficultyLvl}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        <p className="max-w-[320px] truncate">
                          {stripHtml(question.text)}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleViewQuestion(question.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="View Question"
                          >
                            <FiEye className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(question)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Question"
                          >
                            <FiEdit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestionClick(question)}
                            disabled={deleting}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete Question"
                          >
                            <FiTrash2 className="h-4.5 w-4.5" />
                          </button>
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
                      No questions found. Create a single question or import them
                      in bulk to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-5">
            <div className="flex flex-col">
              <p className="text-sm text-slate-500">
                Page <span className="font-semibold text-slate-950">{currentPage}</span>{" "}
                of <span className="font-semibold text-slate-950">{totalPages}</span>
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

        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-[2rem] border border-white/80 p-2 shadow-soft shadow-slate-900/5">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleOpenCreateModal}
                className={`rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition ${
                  createModalOpen
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Add 
              </button>
              <button
                onClick={() => setPanelMode("bulk")}
                className={`rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition ${
                  panelMode === "bulk"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Bulk Upload
              </button>
              <button
                onClick={() => selectedQuestion && setPanelMode("view")}
                disabled={!selectedQuestion}
                className={`rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition ${
                  panelMode === "view"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Details
              </button>
            </div>
          </div>

          {panelMode === "bulk" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Bulk Import Questions
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Upload an Excel sheet to create multiple `mcq` and `rubric`
                    questions in one request. The topic selected here is applied
                    to every imported question.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadQuestionsTemplate}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FiDownload className="mr-2 h-4 w-4" />
                  Template
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Topic For Imported Questions
                </label>
                <select
                  value={bulkTopicID}
                  onChange={(event) => {
                    const topicID = event.target.value;
                    setBulkTopicID(topicID);
                    if (topicID) {
                      setParsedQuestions((current) =>
                        current.map((question) => ({
                          ...question,
                          topic_id: Number(topicID),
                        }))
                      );
                    }
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                >
                  <option value="">Select a topic</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={String(topic.id)}>
                      {topic.name}
                    </option>
                  ))}
                </select>
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
                      Parsed records: <span className="font-semibold">{parsedQuestions.length}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Validation errors: <span className="font-semibold">{criticalErrors.length}</span>
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
                            {topics.find(
                              (topic) =>
                                String(topic.id) === String(question.topic_id)
                            )?.name || "Selected topic"}
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
                disabled={creating || !parsedQuestions.length || !!criticalErrors.length}
                className="mt-6 w-full rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Importing..." : "Import Questions"}
              </button>
            </div>
          )}

          {panelMode === "view" && (
            <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
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
                      dangerouslySetInnerHTML={{ __html: selectedQuestion.text }}
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
                      Topic
                    </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                      {selectedQuestion.topic?.name ||
                        topics.find(
                          (topic) =>
                            String(topic.id) === String(selectedQuestion.topicID)
                        )?.name ||
                        `Topic ${selectedQuestion.topicID}`}
                    </p>
                  </div>

                  {selectedQuestion.type === "mcq" && selectedQuestionMetadata?.options && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Options
                      </p>
                      <div className="mt-3 space-y-2">
                        {selectedQuestionMetadata.options.map((option, index) => (
                          <div
                            key={`${option.text}-${index}`}
                            className={`rounded-xl border px-4 py-3 text-sm ${
                              option.is_correct
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            <div
                              dangerouslySetInnerHTML={{ __html: option.text }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedQuestion.type === "rubric" && selectedQuestionMetadata?.scores && (
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
          )}

          <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FiLayers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Question Guidance
                </h3>
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Use the rich text editor for formatted content and media. For
                  bulk import, keep the Excel sheet aligned to the template so
                  `mcq` metadata and `rubric` scores map cleanly to the API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem]">
            <QuestionForm
              title="Create Questions"
              description="Draft one or more MCQ or rubric questions in this modal, then save them together in a single request."
              topics={topics}
              value={activeCreateForm}
              onChange={updateActiveCreateForm}
              onSubmit={handleCreateQuestion}
              submitLabel={`Save ${createForms.length} Question${createForms.length > 1 ? "s" : ""}`}
              submitting={creating}
              allowBatchActions
              batchPositionLabel={`Question ${activeCreateIndex + 1} of ${createForms.length}`}
              onAddMore={handleAddMoreQuestion}
              onPrevious={() =>
                setActiveCreateIndex((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setActiveCreateIndex((current) =>
                  Math.min(createForms.length - 1, current + 1)
                )
              }
              hasPrevious={activeCreateIndex > 0}
              hasNext={activeCreateIndex < createForms.length - 1}
            />
            <button
              onClick={handleCloseCreateModal}
              className="fixed right-8 top-8 rounded-full bg-white p-3 text-slate-500 shadow-lg transition hover:text-slate-950"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {editModalOpen && questionToEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem]">
            <QuestionForm
              title="Edit Question"
              description="Update question content, metadata, and formatting before saving."
              topics={topics}
              value={editForm}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/10">
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
              {stripHtml(questionToDelete.text) || `Question #${questionToDelete.id}`}
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
