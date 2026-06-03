"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiDownload,
  FiEdit2,
  FiEye,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  Batch,
  BatchDifficultyLevel,
  BatchPayload,
  BatchQuestionType,
  BatchSectionType,
  clearBatchError,
  clearSelectedBatch,
  createBatches,
  deleteBatch,
  fetchBatchById,
  fetchBatches,
  updateBatch,
} from "@/store/slices/batches-slice";
import {
  downloadBatchesTemplate,
  parseBatchesExcelFile,
} from "@/lib/batches-import";
import {
  clearSelectedJobRole,
  fetchJobRoleById,
  fetchJobRoles,
  JobRoleNos,
} from "@/store/slices/jobroles-slice";
import { fetchSectors } from "@/store/slices/sectors-slice";
import { fetchTopics } from "@/store/slices/topics-slice";
import api from "@/lib/api";

type PcForm = {
  topic_id: string;
  nos_code: string;
  pc_code: string;
  question_count: string;
  difficulty_lvl: BatchDifficultyLevel;
  question_type: BatchQuestionType;
  correct_mark: string;
  negative_mark: string;
};

type NosForm = {
  topic_id: string;
  nos_code: string;
  question_count: string;
  difficulty_lvl: BatchDifficultyLevel;
  question_type: BatchQuestionType;
  correct_mark: string;
  negative_mark: string;
  pc_list: PcForm[];
};

type SectionForm = {
  name: string;
  type: BatchSectionType;
  nos_list: NosForm[];
};

type BatchFormState = {
  name: string;
  sector_id: string;
  job_role_id: string;
  theory_time: string;
  practical_time: string;
  viva_time: string;
  sections: SectionForm[];
};

const SECTION_TYPES: BatchSectionType[] = ["theory", "practical", "viva"];
const DIFFICULTIES: BatchDifficultyLevel[] = ["easy", "medium", "hard"];
const QUESTION_TYPES: BatchQuestionType[] = ["mcq", "rubric"];
const INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

function createPc(overrides: Partial<PcForm> = {}): PcForm {
  return {
    topic_id: "",
    nos_code: "",
    pc_code: "",
    question_count: "1",
    difficulty_lvl: "easy",
    question_type: "mcq",
    correct_mark: "0",
    negative_mark: "0",
    ...overrides,
  };
}

function createNos(overrides: Partial<NosForm> = {}): NosForm {
  return {
    topic_id: "",
    nos_code: "",
    question_count: "1",
    difficulty_lvl: "easy",
    question_type: "mcq",
    correct_mark: "0",
    negative_mark: "0",
    pc_list: [],
    ...overrides,
  };
}

function createSection(type: BatchSectionType): SectionForm {
  return {
    name: `${type.charAt(0).toUpperCase()}${type.slice(1)} Section`,
    type,
    nos_list: [createNos()],
  };
}

function createEmptyForm(): BatchFormState {
  return {
    name: "",
    sector_id: "",
    job_role_id: "",
    theory_time: "30",
    practical_time: "30",
    viva_time: "30",
    sections: SECTION_TYPES.map(createSection),
  };
}

function getBatchJobRoleName(batch: Batch) {
  return (
    batch.jobRole?.name ||
    batch.job_role?.name ||
    `Job Role ${batch.job_role_id || "N/A"}`
  );
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNosCode(nos: JobRoleNos) {
  return nos.code || nos.nos_code || "";
}

function getQuestionTotal(data: any): number {
  if (Array.isArray(data)) {
    return data.length;
  }

  return (
    data?.totalQuestions ??
    data?.total ??
    data?.questions?.length ??
    data?.data?.length ??
    0
  );
}

function normalizeBatchToForm(batch: Batch): BatchFormState {
  return {
    name: batch.name || "",
    sector_id: String(batch.jobRole?.id ? batch.jobRole?.id : ""),
    job_role_id: String(batch.job_role_id || ""),
    theory_time: String(batch.theory_time ?? 30),
    practical_time: String(batch.practical_time ?? 30),
    viva_time: String(batch.viva_time ?? 30),
    sections: batch.sections?.length
      ? batch.sections.map((section) => ({
          name: section.name,
          type: section.type,
          nos_list: section.nos_list.map((nos) => ({
            topic_id: String(nos.topic_id ?? ""),
            nos_code: nos.nos_code,
            question_count: String(nos.question_count ?? 1),
            difficulty_lvl: nos.difficulty_lvl,
            question_type: nos.question_type,
            correct_mark: String(nos.correct_mark ?? 0),
            negative_mark: String(nos.negative_mark ?? 0),
            pc_list: nos.pc_list.map((pc) => ({
              topic_id: String(pc.topic_id ?? ""),
              nos_code: pc.nos_code,
              pc_code: pc.pc_code,
              question_count: String(pc.question_count ?? 1),
              difficulty_lvl: pc.difficulty_lvl,
              question_type: pc.question_type,
              correct_mark: String(pc.correct_mark ?? 0),
              negative_mark: String(pc.negative_mark ?? 0),
            })),
          })),
        }))
      : SECTION_TYPES.map(createSection),
  };
}

function buildPayload(form: BatchFormState): BatchPayload | null {
  if (!form.name.trim() || !form.job_role_id) {
    toast.error("Batch name, sector and job role are required.");
    return null;
  }

  const sections = form.sections
    .filter((section) => section.name.trim())
    .map((section) => ({
      name: section.name.trim(),
      type: section.type,
      nos_list: section.nos_list
        .filter((nos) => nos.nos_code.trim())
        .map((nos) => ({
          topic_id: numberOrZero(nos.topic_id),
          nos_code: nos.nos_code.trim(),
          question_count: numberOrZero(nos.question_count),
          difficulty_lvl: nos.difficulty_lvl,
          question_type: nos.question_type,
          correct_mark: numberOrZero(nos.correct_mark),
          negative_mark: numberOrZero(nos.negative_mark),
          pc_list: nos.pc_list
            .filter((pc) => pc.pc_code.trim())
            .map((pc) => ({
              topic_id: numberOrZero(pc.topic_id || nos.topic_id),
              nos_code: pc.nos_code.trim() || nos.nos_code.trim(),
              pc_code: pc.pc_code.trim(),
              question_count: numberOrZero(pc.question_count),
              difficulty_lvl: pc.difficulty_lvl,
              question_type: pc.question_type,
              correct_mark: numberOrZero(pc.correct_mark),
              negative_mark: numberOrZero(pc.negative_mark),
            })),
        })),
    }));

  if (
    !sections.length ||
    sections.some((section) => !section.nos_list.length)
  ) {
    toast.error(
      "Add at least one NOS row inside every section you want to save."
    );
    return null;
  }

  return {
    name: form.name.trim(),
    job_role_id: Number(form.job_role_id),
    theory_time: numberOrZero(form.theory_time),
    practical_time: numberOrZero(form.practical_time),
    viva_time: numberOrZero(form.viva_time),
    sections,
  };
}

export default function BatchesPage() {
  const dispatch = useAppDispatch();
  const {
    batches,
    totalBatches,
    totalPages,
    currentPage,
    hasNext,
    hasPrev,
    loading,
    creating,
    updating,
    deleting,
    viewLoading,
    selectedBatch,
    error,
  } = useAppSelector((state) => state.batches);
  const { sectors } = useAppSelector((state) => state.sectors);
  const {
    jobRoles,
    selectedJobRole,
    viewLoading: jobRoleDetailLoading,
  } = useAppSelector((state) => state.jobRoles);
  const { topics } = useAppSelector((state) => state.topics);

  const [form, setForm] = useState<BatchFormState>(createEmptyForm());
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSectorId, setBulkSectorId] = useState("");
  const [bulkJobRoleId, setBulkJobRoleId] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkMessages, setBulkMessages] = useState<string[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: error });
      dispatch(clearBatchError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    dispatch(fetchBatches({ page: 1, limit: 10 }));
    dispatch(fetchSectors({ page: 1, limit: 1000 }));
    dispatch(fetchJobRoles({ page: 1, limit: 1000 }));
    dispatch(fetchTopics({ page: 1, limit: 1000 }));
  }, [dispatch]);

  useEffect(() => {
    if (form.job_role_id && modalMode) {
      dispatch(fetchJobRoleById(form.job_role_id));
      return;
    }

    dispatch(clearSelectedJobRole());
  }, [dispatch, form.job_role_id, modalMode]);

  const filteredJobRoles = useMemo(
    () =>
      form.sector_id
        ? jobRoles.filter(
            (jobRole) => String(jobRole.sector_id) === form.sector_id
          )
        : jobRoles,
    [form.sector_id, jobRoles]
  );

  const filteredBulkJobRoles = useMemo(
    () =>
      bulkSectorId
        ? jobRoles.filter(
            (jobRole) => String(jobRole.sector_id) === bulkSectorId
          )
        : jobRoles,
    [bulkSectorId, jobRoles]
  );

  const selectedNosList = useMemo(
    () => selectedJobRole?.nos_list || [],
    [selectedJobRole]
  );

  const loadQuestionCount = async (topicId: string) => {
    if (!topicId || questionCounts[topicId] !== undefined) {
      return;
    }

    try {
      const response = await api.get("/questions", {
        params: { topicId: topicId, page: 1, limit: 1 },
      });
      setQuestionCounts((current) => ({
        ...current,
        [topicId]: getQuestionTotal(response.data),
      }));
    } catch {
      setQuestionCounts((current) => ({ ...current, [topicId]: 0 }));
    }
  };

  useEffect(() => {
    if (!modalMode) {
      return;
    }

    const topicIds = new Set<string>();
    form.sections.forEach((section) => {
      section.nos_list.forEach((nos) => {
        if (nos.topic_id) {
          topicIds.add(nos.topic_id);
        }
        nos.pc_list.forEach((pc) => {
          if (pc.topic_id) {
            topicIds.add(pc.topic_id);
          }
        });
      });
    });

    topicIds.forEach((topicId) => {
      void loadQuestionCount(topicId);
    });
  }, [form.sections, modalMode]);

  const refreshBatches = () => {
    dispatch(fetchBatches({ page: currentPage, limit: 10 }));
  };

  const openCreateModal = () => {
    setForm(createEmptyForm());
    setBatchToEdit(null);
    setModalMode("create");
  };

  const openEditModal = (batch: Batch) => {
    const jobRole = jobRoles.find(
      (item) => String(item.id) === String(batch.job_role_id)
    );
    setForm({
      ...normalizeBatchToForm(batch),
      sector_id: String(jobRole?.sector_id || ""),
    });
    setBatchToEdit(batch);
    setModalMode("edit");
  };

  const closeFormModal = () => {
    setModalMode(null);
    setBatchToEdit(null);
    setForm(createEmptyForm());
  };

  const setFormField = <K extends keyof BatchFormState>(
    field: K,
    value: BatchFormState[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateSection = (sectionIndex: number, nextSection: SectionForm) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex ? nextSection : section
      ),
    }));
  };

  const updateNos = (
    sectionIndex: number,
    nosIndex: number,
    nextNos: NosForm
  ) => {
    const section = form.sections[sectionIndex];
    updateSection(sectionIndex, {
      ...section,
      nos_list: section.nos_list.map((nos, index) =>
        index === nosIndex ? nextNos : nos
      ),
    });
  };

  const updatePc = (
    sectionIndex: number,
    nosIndex: number,
    pcIndex: number,
    nextPc: PcForm
  ) => {
    const nos = form.sections[sectionIndex].nos_list[nosIndex];
    updateNos(sectionIndex, nosIndex, {
      ...nos,
      pc_list: nos.pc_list.map((pc, index) =>
        index === pcIndex ? nextPc : pc
      ),
    });
  };

  const removeSection = (sectionIndex: number) => {
    if (form.sections.length <= 1) {
      toast.error("At least one section is required.");
      return;
    }

    setForm((current) => ({
      ...current,
      sections: current.sections.filter((_, index) => index !== sectionIndex),
    }));
  };

  const removeNos = (sectionIndex: number, nosIndex: number) => {
    const section = form.sections[sectionIndex];
    if (section.nos_list.length <= 1) {
      toast.error("Each section needs at least one NOS row.");
      return;
    }

    updateSection(sectionIndex, {
      ...section,
      nos_list: section.nos_list.filter((_, index) => index !== nosIndex),
    });
  };

  const handleNosTopicChange = (
    sectionIndex: number,
    nosIndex: number,
    topicId: string
  ) => {
    const nos = form.sections[sectionIndex].nos_list[nosIndex];
    updateNos(sectionIndex, nosIndex, {
      ...nos,
      topic_id: topicId,
      pc_list: nos.pc_list.map((pc) => ({ ...pc, topic_id: topicId })),
    });
    void loadQuestionCount(topicId);
  };

  const handleNosCodeChange = (
    sectionIndex: number,
    nosIndex: number,
    nosCode: string
  ) => {
    const nos = form.sections[sectionIndex].nos_list[nosIndex];
    updateNos(sectionIndex, nosIndex, {
      ...nos,
      nos_code: nosCode,
      pc_list: nos.pc_list.map((pc) => ({ ...pc, nos_code: nosCode })),
    });
  };

  const handlePcCodeChange = (
    sectionIndex: number,
    nosIndex: number,
    pcIndex: number,
    pcCode: string
  ) => {
    const nos = form.sections[sectionIndex].nos_list[nosIndex];
    const pc = nos.pc_list[pcIndex];
    updatePc(sectionIndex, nosIndex, pcIndex, {
      ...pc,
      pc_code: pcCode,
    });
  };

  const removePc = (
    sectionIndex: number,
    nosIndex: number,
    pcIndex: number
  ) => {
    const nos = form.sections[sectionIndex].nos_list[nosIndex];
    updateNos(sectionIndex, nosIndex, {
      ...nos,
      pc_list: nos.pc_list.filter((_, index) => index !== pcIndex),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = buildPayload(form);
    if (!payload) {
      return;
    }

    const resultAction =
      modalMode === "edit" && batchToEdit
        ? await dispatch(updateBatch({ id: batchToEdit.id, ...payload }))
        : await dispatch(createBatches([payload]));

    if (
      (modalMode === "edit" && updateBatch.fulfilled.match(resultAction)) ||
      (modalMode === "create" && createBatches.fulfilled.match(resultAction))
    ) {
      toast.success(
        modalMode === "edit"
          ? "Batch updated successfully."
          : "Batch created successfully."
      );
      closeFormModal();
      refreshBatches();
    }
  };

  const handleView = (id: string | number) => {
    setDetailsOpen(true);
    dispatch(fetchBatchById(id));
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) {
      return;
    }

    const resultAction = await dispatch(deleteBatch(batchToDelete.id));
    if (deleteBatch.fulfilled.match(resultAction)) {
      toast.success("Batch deleted successfully.");
      setBatchToDelete(null);
      refreshBatches();
      if (selectedBatch?.id === batchToDelete.id) {
        dispatch(clearSelectedBatch());
      }
    }
  };

  const handleBulkFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.endsWith(".xlsx")) {
      toast.error("Please upload a valid Excel file (.xlsx).");
      setBulkFile(null);
      return;
    }

    setBulkFile(file);
    setBulkMessages([]);
  };

  const handleBulkImport = async () => {
    if (!bulkSectorId || !bulkJobRoleId) {
      toast.error(
        "Select sector and job role before uploading the Excel file."
      );
      return;
    }
    if (!bulkFile) {
      toast.error("Select an Excel file before importing.");
      return;
    }

    const result = parseBatchesExcelFile(await bulkFile.arrayBuffer(), {
      jobRoleId: Number(bulkJobRoleId),
    });
    const errors = result.errors.filter((error) => error.type === "error");
    setBulkMessages(result.errors.map((error) => error.message));

    if (errors.length || !result.batches.length) {
      toast.error("Excel import has errors. Please review the messages.");
      return;
    }

    const resultAction = await dispatch(createBatches(result.batches));
    if (createBatches.fulfilled.match(resultAction)) {
      toast.success(`${result.batches.length} batches imported successfully.`);
      setBulkOpen(false);
      setBulkFile(null);
      setBulkMessages([]);
      refreshBatches();
    }
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-8 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Assessment Delivery
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Batches
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiUploadCloud className="h-4 w-4" />
              Bulk Upload
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-slate-950/20 transition hover:opacity-90"
            >
              <FiPlus className="h-4 w-4" />
              Create Batch
            </button>
            <div className="border-l border-slate-200 pl-5 text-right">
              <p className="text-3xl font-bold text-slate-950">
                {totalBatches}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Registered Batches
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="glass-panel flex flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ID
                </th>
                <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Job Role
                </th>
                <th className="px-6 py-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Time T/P/V
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
                      <div className="h-4 w-10 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-44 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-32 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-4 w-20 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="ml-auto h-4 w-24 rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : batches.length ? (
                batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="group transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-5 text-sm font-medium text-slate-400">
                      #{batch.id}
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                      {batch.name || "Untitled batch"}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {getBatchJobRoleName(batch)}
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600">
                      {batch.theory_time ?? 0} / {batch.practical_time ?? 0} /{" "}
                      {batch.viva_time ?? 0}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleView(batch.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                          title="View Batch"
                        >
                          <FiEye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(batch)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Batch"
                        >
                          <FiEdit2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => setBatchToDelete(batch)}
                          disabled={deleting}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Delete Batch"
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
                    colSpan={5}
                    className="px-6 py-20 text-center text-sm text-slate-500"
                  >
                    No batches found. Create a batch or upload the Excel
                    template.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-5">
          <p className="text-sm text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-950">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-950">
              {totalPages || 1}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={!hasPrev || loading}
              onClick={() =>
                dispatch(fetchBatches({ page: currentPage - 1, limit: 10 }))
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={!hasNext || loading}
              onClick={() =>
                dispatch(fetchBatches({ page: currentPage + 1, limit: 10 }))
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {modalMode === "edit" ? "Edit Batch" : "Create Batch"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select sector and job role, then fill section, NOS and PC
                  details.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-7 py-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Batch Name">
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setFormField("name", event.target.value)
                    }
                    className={INPUT_CLASS}
                    placeholder="React Batch 1"
                  />
                </Field>
                <Field label="Sector">
                  <select
                    value={form.sector_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sector_id: event.target.value,
                        job_role_id: "",
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">Select sector</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Job Role">
                  <select
                    value={form.job_role_id}
                    onChange={(event) =>
                      setFormField("job_role_id", event.target.value)
                    }
                    className={INPUT_CLASS}
                    disabled={!form.sector_id}
                  >
                    <option value="">Select job role</option>
                    {filteredJobRoles.map((jobRole) => (
                      <option key={jobRole.id} value={jobRole.id}>
                        {jobRole.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Theory Time">
                  <input
                    type="number"
                    value={form.theory_time}
                    onChange={(event) =>
                      setFormField("theory_time", event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Practical Time">
                  <input
                    type="number"
                    value={form.practical_time}
                    onChange={(event) =>
                      setFormField("practical_time", event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Viva Time">
                  <input
                    type="number"
                    value={form.viva_time}
                    onChange={(event) =>
                      setFormField("viva_time", event.target.value)
                    }
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              {form.job_role_id && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {jobRoleDetailLoading
                    ? "Loading NOS and PC details for selected job role..."
                    : `${selectedNosList.length} NOS available from selected job role.`}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Sections
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      sections: [...current.sections, createSection("theory")],
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Add Section
                </button>
              </div>

              <div className="mt-3 space-y-5">
                {form.sections.map((section, sectionIndex) => (
                  <div
                    key={`${section.type}-${sectionIndex}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                      <Field label="Section Name">
                        <input
                          value={section.name}
                          onChange={(event) =>
                            updateSection(sectionIndex, {
                              ...section,
                              name: event.target.value,
                            })
                          }
                          className={INPUT_CLASS}
                        />
                      </Field>
                      <Field label="Type">
                        <select
                          value={section.type}
                          onChange={(event) =>
                            updateSection(sectionIndex, {
                              ...section,
                              type: event.target.value as BatchSectionType,
                            })
                          }
                          className={INPUT_CLASS}
                        >
                          {SECTION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="flex items-end">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSection(sectionIndex, {
                                ...section,
                                nos_list: [...section.nos_list, createNos()],
                              })
                            }
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700"
                          >
                            Add NOS
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(sectionIndex)}
                            disabled={form.sections.length <= 1}
                            className="rounded-xl border border-red-100 bg-white px-4 py-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove Section
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {section.nos_list.map((nos, nosIndex) => (
                        <div
                          key={`${sectionIndex}-${nosIndex}`}
                          className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              NOS {nosIndex + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeNos(sectionIndex, nosIndex)}
                              disabled={section.nos_list.length <= 1}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" />
                              Remove NOS
                            </button>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-7">
                            <Field label="Topic">
                              <select
                                value={nos.topic_id}
                                onChange={(event) =>
                                  handleNosTopicChange(
                                    sectionIndex,
                                    nosIndex,
                                    event.target.value
                                  )
                                }
                                className={INPUT_CLASS}
                              >
                                <option value="">Topic</option>
                                {topics.map((topic) => (
                                  <option key={topic.id} value={topic.id}>
                                    {topic.name}
                                    {questionCounts[String(topic.id)] !==
                                    undefined
                                      ? ` (${
                                          questionCounts[String(topic.id)]
                                        } questions)`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                              {nos.topic_id && (
                                <span className="ml-1 text-xs font-semibold text-slate-500">
                                  Available:{" "}
                                  {questionCounts[nos.topic_id] ?? "Loading..."}
                                </span>
                              )}
                            </Field>
                            <Field label="NOS Code">
                              <select
                                value={nos.nos_code}
                                onChange={(event) =>
                                  handleNosCodeChange(
                                    sectionIndex,
                                    nosIndex,
                                    event.target.value
                                  )
                                }
                                className={INPUT_CLASS}
                                disabled={!selectedNosList.length}
                              >
                                <option value="">Select NOS</option>
                                {selectedNosList.map((jobRoleNos) => {
                                  const nosCode = getNosCode(jobRoleNos);
                                  return (
                                    <option
                                      key={jobRoleNos.id || nosCode}
                                      value={nosCode}
                                    >
                                      {nosCode}{" "}
                                      {jobRoleNos.name
                                        ? `- ${jobRoleNos.name}`
                                        : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </Field>
                            <Field label="Questions">
                              <input
                                type="number"
                                value={nos.question_count}
                                onChange={(event) =>
                                  updateNos(sectionIndex, nosIndex, {
                                    ...nos,
                                    question_count: event.target.value,
                                  })
                                }
                                className={INPUT_CLASS}
                              />
                              {nos.topic_id && (
                                <span className="ml-1 text-xs text-slate-400">
                                  {questionCounts[nos.topic_id] === undefined
                                    ? "Loading..."
                                    : `of ${
                                        questionCounts[nos.topic_id]
                                      } available`}
                                </span>
                              )}
                              {nos.topic_id &&
                                questionCounts[nos.topic_id] !== undefined &&
                                Number(nos.question_count) >
                                  questionCounts[nos.topic_id] && (
                                  <span className="ml-1 text-xs font-semibold text-red-500">
                                    Exceeds available questions
                                  </span>
                                )}
                            </Field>
                            <Field label="Difficulty">
                              <select
                                value={nos.difficulty_lvl}
                                onChange={(event) =>
                                  updateNos(sectionIndex, nosIndex, {
                                    ...nos,
                                    difficulty_lvl: event.target
                                      .value as BatchDifficultyLevel,
                                  })
                                }
                                className={INPUT_CLASS}
                              >
                                {DIFFICULTIES.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Question Type">
                              <select
                                value={nos.question_type}
                                onChange={(event) =>
                                  updateNos(sectionIndex, nosIndex, {
                                    ...nos,
                                    question_type: event.target
                                      .value as BatchQuestionType,
                                  })
                                }
                                className={INPUT_CLASS}
                              >
                                {QUESTION_TYPES.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Correct Mark">
                              <input
                                type="number"
                                value={nos.correct_mark}
                                onChange={(event) =>
                                  updateNos(sectionIndex, nosIndex, {
                                    ...nos,
                                    correct_mark: event.target.value,
                                  })
                                }
                                className={INPUT_CLASS}
                              />
                            </Field>
                            <Field label="Negative Mark">
                              <input
                                type="number"
                                value={nos.negative_mark}
                                onChange={(event) =>
                                  updateNos(sectionIndex, nosIndex, {
                                    ...nos,
                                    negative_mark: event.target.value,
                                  })
                                }
                                className={INPUT_CLASS}
                              />
                            </Field>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              PC List
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                updateNos(sectionIndex, nosIndex, {
                                  ...nos,
                                  pc_list: [
                                    ...nos.pc_list,
                                    createPc({
                                      topic_id: nos.topic_id,
                                      nos_code: nos.nos_code,
                                      difficulty_lvl: nos.difficulty_lvl,
                                      question_type: nos.question_type,
                                    }),
                                  ],
                                })
                              }
                              className="text-xs font-semibold text-slate-700"
                            >
                              Add PC
                            </button>
                          </div>

                          <div className="mt-3 space-y-2">
                            {nos.pc_list.length ? (
                              nos.pc_list.map((pc, pcIndex) => {
                                const selectedNos = selectedNosList.find(
                                  (jobRoleNos) =>
                                    getNosCode(jobRoleNos) === nos.nos_code
                                );
                                const pcOptions = selectedNos?.pc_list || [];

                                return (
                                  <div
                                    key={`${sectionIndex}-${nosIndex}-${pcIndex}`}
                                    className="rounded-xl bg-slate-50 p-3"
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                        PC {pcIndex + 1}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex
                                          )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                      >
                                        <FiTrash2 className="h-3.5 w-3.5" />
                                        Remove PC
                                      </button>
                                    </div>
                                    <div className="grid gap-2 lg:grid-cols-7">
                                      {pcOptions.length ? (
                                        <select
                                          value={pc.pc_code}
                                          onChange={(event) =>
                                            handlePcCodeChange(
                                              sectionIndex,
                                              nosIndex,
                                              pcIndex,
                                              event.target.value
                                            )
                                          }
                                          className={INPUT_CLASS}
                                        >
                                          <option value="">Select PC</option>
                                          {pcOptions.map((option) => {
                                            const pcCode =
                                              option.code ||
                                              option.pc_code ||
                                              "";
                                            return (
                                              <option
                                                key={option.id || pcCode}
                                                value={pcCode}
                                              >
                                                {pcCode}{" "}
                                                {option.name
                                                  ? `- ${option.name}`
                                                  : ""}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      ) : (
                                        <input
                                          value={pc.pc_code}
                                          onChange={(event) =>
                                            handlePcCodeChange(
                                              sectionIndex,
                                              nosIndex,
                                              pcIndex,
                                              event.target.value
                                            )
                                          }
                                          className={INPUT_CLASS}
                                          placeholder="PC code"
                                        />
                                      )}
                                      <input
                                        value={pc.nos_code}
                                        onChange={(event) =>
                                          updatePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex,
                                            {
                                              ...pc,
                                              nos_code: event.target.value,
                                            }
                                          )
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="NOS code"
                                      />
                                      <input
                                        type="number"
                                        value={pc.question_count}
                                        onChange={(event) =>
                                          updatePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex,
                                            {
                                              ...pc,
                                              question_count:
                                                event.target.value,
                                            }
                                          )
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="Questions"
                                      />
                                      <select
                                        value={pc.difficulty_lvl}
                                        onChange={(event) =>
                                          updatePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex,
                                            {
                                              ...pc,
                                              difficulty_lvl: event.target
                                                .value as BatchDifficultyLevel,
                                            }
                                          )
                                        }
                                        className={INPUT_CLASS}
                                      >
                                        {DIFFICULTIES.map((value) => (
                                          <option key={value} value={value}>
                                            {value}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={pc.question_type}
                                        onChange={(event) =>
                                          updatePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex,
                                            {
                                              ...pc,
                                              question_type: event.target
                                                .value as BatchQuestionType,
                                            }
                                          )
                                        }
                                        className={INPUT_CLASS}
                                      >
                                        {QUESTION_TYPES.map((value) => (
                                          <option key={value} value={value}>
                                            {value}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        value={pc.correct_mark}
                                        onChange={(event) =>
                                          updatePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex,
                                            {
                                              ...pc,
                                              correct_mark: event.target.value,
                                            }
                                          )
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="Correct"
                                      />
                                      <input
                                        type="number"
                                        value={pc.negative_mark}
                                        onChange={(event) =>
                                          updatePc(
                                            sectionIndex,
                                            nosIndex,
                                            pcIndex,
                                            {
                                              ...pc,
                                              negative_mark: event.target.value,
                                            }
                                          )
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="Negative"
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                                No PC rows added. Use Add PC when this NOS needs
                                PC-level marks.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-7 py-5">
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || updating}
                className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {modalMode === "edit"
                  ? updating
                    ? "Updating..."
                    : "Update Batch"
                  : creating
                  ? "Creating..."
                  : "Create Batch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Bulk Upload Batches
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Select sector and job role first. The upload will use that job
                  role for every batch in the file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkOpen(false);
                  setBulkFile(null);
                  setBulkMessages([]);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <Field label="Sector">
                <select
                  value={bulkSectorId}
                  onChange={(event) => {
                    setBulkSectorId(event.target.value);
                    setBulkJobRoleId("");
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="">Select sector</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Job Role">
                <select
                  value={bulkJobRoleId}
                  onChange={(event) => setBulkJobRoleId(event.target.value)}
                  className={INPUT_CLASS}
                  disabled={!bulkSectorId}
                >
                  <option value="">Select job role</option>
                  {filteredBulkJobRoles.map((jobRole) => (
                    <option key={jobRole.id} value={jobRole.id}>
                      {jobRole.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={downloadBatchesTemplate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <FiDownload className="h-4 w-4" />
                  Template
                </button>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                  <FiUploadCloud className="h-4 w-4" />
                  Select .xlsx
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleBulkFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              {bulkFile && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                      Selected File
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-emerald-950">
                      {bulkFile.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkFile(null);
                      setBulkMessages([]);
                    }}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800"
                  >
                    Remove
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={creating || !bulkFile}
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Importing..." : "Import Selected File"}
              </button>
              {!!bulkMessages.length && (
                <div className="max-h-36 overflow-auto rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                  {bulkMessages.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <h2 className="text-xl font-semibold text-slate-950">
                Batch Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  dispatch(clearSelectedBatch());
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-7">
              {viewLoading ? (
                <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
              ) : selectedBatch ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-slate-500">
                      #{selectedBatch.id}
                    </p>
                    <h3 className="text-2xl font-semibold text-slate-950">
                      {selectedBatch.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {getBatchJobRoleName(selectedBatch)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Stat
                      label="Theory"
                      value={selectedBatch.theory_time ?? 0}
                    />
                    <Stat
                      label="Practical"
                      value={selectedBatch.practical_time ?? 0}
                    />
                    <Stat label="Viva" value={selectedBatch.viva_time ?? 0} />
                  </div>
                  {(selectedBatch.sections || []).map((section) => (
                    <div
                      key={`${section.type}-${section.name}`}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {section.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {section.type}
                      </p>
                      <div className="mt-4 space-y-3">
                        {section.nos_list.map((nos) => (
                          <div
                            key={nos.nos_code}
                            className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"
                          >
                            <p className="font-semibold text-slate-900">
                              {nos.nos_code}
                            </p>
                            <p className="mt-1">
                              Questions: {nos.question_count} ·{" "}
                              {nos.difficulty_lvl} · {nos.question_type}
                            </p>
                            <p className="mt-1">
                              PCs:{" "}
                              {nos.pc_list.map((pc) => pc.pc_code).join(", ") ||
                                "None"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No batch selected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-7 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-950">
              Delete Batch
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              This will delete{" "}
              <span className="font-semibold text-slate-900">
                {batchToDelete.name || `Batch #${batchToDelete.id}`}
              </span>
              .
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xl font-bold text-slate-950">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
    </div>
  );
}
