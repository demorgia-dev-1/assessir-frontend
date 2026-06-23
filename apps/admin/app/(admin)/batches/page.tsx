// @ts-nocheck
"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiDownload,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiX,
  FiUsers,
  FiAlertTriangle,
  FiCheck,
  FiKey,
  FiFileText,
  FiCalendar,
  FiSend,
  FiExternalLink,
  FiShare2,
  FiCopy,
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
  setBatchSlot,
  publishBatch,
} from "@/store/slices/batches-slice";
import {
  fetchCandidates,
  createCandidates,
  clearCandidates,
} from "@/store/slices/candidates-slice";
import {
  downloadBatchesTemplate,
  parseBatchesExcelFile,
} from "@/lib/batches-import";
import {
  downloadCandidatesTemplate,
  parseCandidatesExcelFile,
} from "@/lib/candidates-import";
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
  theory_time?: number;
  practical_time?: number;
  viva_time?: number;
  is_authorization_required_in_theory: boolean;
  is_authorization_required_in_practical: boolean;
  is_authorization_required_in_viva: boolean;
  is_onboarding_selfie_required_theory: boolean;
  is_random_evidence_required_theory: boolean;
  is_onboarding_selfie_required_practical: boolean;
  is_random_evidence_required_practical: boolean;
  is_onboarding_selfie_required_viva: boolean;
  is_random_evidence_required_viva: boolean;
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
    is_authorization_required_in_theory: false,
    is_authorization_required_in_practical: false,
    is_authorization_required_in_viva: false,
    is_onboarding_selfie_required_theory: false,
    is_random_evidence_required_theory: false,
    is_onboarding_selfie_required_practical: false,
    is_random_evidence_required_practical: false,
    is_onboarding_selfie_required_viva: false,
    is_random_evidence_required_viva: false,
    sections: SECTION_TYPES.map(createSection),
  };
}

function getBatchJobRoleName(batch: Batch) {
  return (
    batch.jobRole?.name ||
    batch.job_role?.name ||
    batch.jobrole?.name ||
    `Job Role ${batch.job_role_id || "N/A"}`
  );
}

function getBatchSectorName(batch: Batch) {
  const sector =
    batch.jobRole?.sector || batch.job_role?.sector || batch.jobrole?.sector;
  return sector?.name || "";
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
    sector_id: String(
      batch.jobRole?.sector_id ??
        batch.job_role?.sector_id ??
        batch.jobrole?.sector_id ??
        ""
    ),
    job_role_id: String(batch.job_role_id || ""),
    theory_time: batch.theory_time ?? 0,
    practical_time: batch.practical_time ?? 0,
    viva_time: batch.viva_time ?? 0,
    is_authorization_required_in_theory:
      batch.is_authorization_required_in_theory ?? false,
    is_authorization_required_in_practical:
      batch.is_authorization_required_in_practical ?? false,
    is_authorization_required_in_viva:
      batch.is_authorization_required_in_viva ?? false,
    is_onboarding_selfie_required_theory:
      batch.is_onboarding_selfie_required_theory ?? false,
    is_random_evidence_required_theory:
      batch.is_random_evidence_required_theory ?? false,
    is_onboarding_selfie_required_practical:
      batch.is_onboarding_selfie_required_practical ?? false,
    is_random_evidence_required_practical:
      batch.is_random_evidence_required_practical ?? false,
    is_onboarding_selfie_required_viva:
      batch.is_onboarding_selfie_required_viva ?? false,
    is_random_evidence_required_viva:
      batch.is_random_evidence_required_viva ?? false,
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
    theory_time: form.theory_time ?? 0,
    practical_time: form.practical_time ?? 0,
    viva_time: form.viva_time ?? 0,
    is_authorization_required_in_theory:
      form.is_authorization_required_in_theory,
    is_authorization_required_in_practical:
      form.is_authorization_required_in_practical,
    is_authorization_required_in_viva: form.is_authorization_required_in_viva,
    is_onboarding_selfie_required_theory:
      form.is_onboarding_selfie_required_theory,
    is_random_evidence_required_theory:
      form.is_random_evidence_required_theory,
    is_onboarding_selfie_required_practical:
      form.is_onboarding_selfie_required_practical,
    is_random_evidence_required_practical:
      form.is_random_evidence_required_practical,
    is_onboarding_selfie_required_viva:
      form.is_onboarding_selfie_required_viva,
    is_random_evidence_required_viva:
      form.is_random_evidence_required_viva,
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
  const {
    candidates: batchCandidates,
    loading: candidatesLoading,
    error: candidatesError,
  } = useAppSelector((state) => state.candidates);
  const { sectors } = useAppSelector((state) => state.sectors);
  const {
    jobRoles,
    selectedJobRole,
    viewLoading: jobRoleDetailLoading,
  } = useAppSelector((state) => state.jobRoles);
  const { topics } = useAppSelector((state) => state.topics);
  console.log(batches);
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
  const [detailsTab, setDetailsTab] = useState<"structure" | "candidates">(
    "structure"
  );
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
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [schedulingBatchId, setSchedulingBatchId] = useState<
    string | number | null
  >(null);
  const [slotForm, setSlotForm] = useState({
    testType: "THEORY",
    startDateTime: "",
    endDateTime: "",
  });
  const [isSubmittingSlot, setIsSubmittingSlot] = useState(false);
  const [batchToPublish, setBatchToPublish] = useState<Batch | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

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

    if (bulkJobRoleId && bulkOpen) {
      dispatch(fetchJobRoleById(bulkJobRoleId));
      return;
    }

    dispatch(clearSelectedJobRole());
  }, [dispatch, form.job_role_id, modalMode, bulkJobRoleId, bulkOpen]);

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

  // Auto-populate sections and NOS when job role is selected in create mode
  useEffect(() => {
    if (modalMode !== "create" || !selectedJobRole || jobRoleDetailLoading) {
      return;
    }

    const nosList = selectedJobRole.nos_list || [];
    const hasTheory =
      nosList.some((nos) => Number(nos.total_theory_marks) > 0) ||
      Number(selectedJobRole.total_theory_marks) > 0;
    const hasPractical =
      nosList.some((nos) => Number(nos.total_practical_marks) > 0) ||
      Number(selectedJobRole.total_practical_marks) > 0;
    const hasViva =
      nosList.some((nos) => Number(nos.total_viva_marks) > 0) ||
      Number(selectedJobRole.total_viva_marks) > 0;

    const buildNosListForSection = (
      sectionType: BatchSectionType
    ): NosForm[] => {
      if (!nosList.length) return [createNos()];
      return nosList.map((nos) =>
        createNos({
          nos_code: getNosCode(nos),
          question_count: "1",
          difficulty_lvl: sectionType === "practical" ? "medium" : "easy",
          question_type: sectionType === "practical" ? "rubric" : "mcq",
          correct_mark: "0",
          negative_mark: "0",
        })
      );
    };

    const sections: SectionForm[] = [];
    if (hasTheory) {
      sections.push({
        name: "Theory Section",
        type: "theory",
        nos_list: buildNosListForSection("theory"),
      });
    }
    if (hasPractical) {
      sections.push({
        name: "Practical Section",
        type: "practical",
        nos_list: buildNosListForSection("practical"),
      });
    }
    if (hasViva) {
      sections.push({
        name: "Viva Section",
        type: "viva",
        nos_list: buildNosListForSection("viva"),
      });
    }
    // Fallback: at least one section
    if (!sections.length) {
      sections.push({
        name: "Section 1",
        type: "theory",
        nos_list: buildNosListForSection("theory"),
      });
    }

    setForm((current) => ({
      ...current,
      sections,
    }));
  }, [selectedJobRole, modalMode, jobRoleDetailLoading]);

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

  const handleOpenSlotModal = (batchId: string | number) => {
    setSchedulingBatchId(batchId);
    setSlotForm({ testType: "", startDateTime: "", endDateTime: "" });
    setSlotModalOpen(true);
  };

  const handleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingBatchId) return;

    setIsSubmittingSlot(true);
    // Ensure inputs match format expectation: Convert native local datetime values to ISO string format
    const payload = {
      batchId: schedulingBatchId,
      testType: slotForm.testType,
      startDateTime: new Date(slotForm.startDateTime).toISOString(),
      endDateTime: new Date(slotForm.endDateTime).toISOString(),
    };

    const actionResult = await dispatch(setBatchSlot(payload as any));
    setIsSubmittingSlot(false);

    if (setBatchSlot.fulfilled.match(actionResult)) {
      setSlotModalOpen(false);
      refreshBatches();
    }
  };

  const handleOpenPublishModal = (batch: Batch) => {
    setBatchToPublish(batch);
  };

  const handleConfirmPublish = async () => {
    if (!batchToPublish) return;

    setIsPublishing(true);
    const actionResult = await dispatch(publishBatch(batchToPublish.id));
    setIsPublishing(false);

    if (publishBatch.fulfilled.match(actionResult)) {
      setBatchToPublish(null);
      refreshBatches();
    }
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
      closeFormModal();
      refreshBatches();
    }
  };

  const handleView = (id: string | number) => {
    setDetailsOpen(true);
    setDetailsTab("structure");
    setIsAddingManually(false);
    setManualCandidates([{ enrollment_no: "", password: "" }]);
    setIsUploadingExcel(false);
    setExcelFile(null);
    setExcelValidationErrors([]);
    setExcelParsedCandidates([]);
    setRevealedPasswords({});
    setLoadingPasswords({});
    dispatch(fetchBatchById(id));
    dispatch(fetchCandidates(id));
  };

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
      const response = await api.post(`/batches/${selectedBatch.id}/show-password`, {
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

  const handleConfirmDelete = async () => {
    if (!batchToDelete) {
      return;
    }

    const resultAction = await dispatch(deleteBatch(batchToDelete.id));
    if (deleteBatch.fulfilled.match(resultAction)) {
      setBatchToDelete(null);
      refreshBatches();
      if (selectedBatch?.id === batchToDelete.id) {
        dispatch(clearSelectedBatch());
      }
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
    reader.onerror = () => {
      toast.error("Failed to read Excel file.");
    };
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
          <div className="border-l border-slate-200 pl-5 text-right">
            <p className="text-3xl font-bold text-slate-950">{totalBatches}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Registered Batches
            </p>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 gap-6 lg:min-h-[calc(100vh-18rem)] lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT PANEL — Batches Table */}
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="min-h-0 flex-1 overflow-auto">
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
                    Status
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
                        <div className="h-4 w-20 rounded bg-slate-100" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 w-44 rounded bg-slate-100" />
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
                        {batch.id}
                      </td>
                      <td className="px-6 py-5 text-sm font-semibold text-slate-900">
                        {batch.name || "Untitled batch"}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {getBatchJobRoleName(batch)}
                          </span>
                          {getBatchSectorName(batch) && (
                            <span className="text-xs text-slate-400 font-medium mt-0.5">
                              {getBatchSectorName(batch)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {/* Status Badge Indicator */}
                          {batch.is_published ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Draft
                            </span>
                          )}
                        </div>
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
                          {/* <button
                          onClick={() => openEditModal(batch)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Edit Batch"
                        >
                          <FiEdit2 className="h-4.5 w-4.5" />
                        </button> */}
                          <button
                            onClick={() => handleOpenSlotModal(batch.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                            title="Configure Time Slot"
                          >
                            <FiCalendar className="h-4.5 w-4.5" />
                          </button>

                          <a
                            href={`${process.env.NEXT_PUBLIC_CANDIDATE_APP_URL || 'http://localhost:3002'}/batches/${batch.id}/exam/login`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
                            title="Open Candidate Exam Login"
                          >
                            <FiExternalLink className="h-4.5 w-4.5" />
                          </a>

                          {!batch.is_published && (
                            <button
                              onClick={() => handleOpenPublishModal(batch)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
                              title="Publish Batch"
                            >
                              <FiSend className="h-4.5 w-4.5" />
                            </button>
                          )}
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
          {/* end overflow-auto */}

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-5">
            <p className="text-sm text-slate-500">
              Page{" "}
              <span className="font-semibold text-slate-950">
                {currentPage}
              </span>{" "}
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
          {/* end left panel */}
        </div>
        {/* RIGHT PANEL — Actions */}
        <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 shadow-soft shadow-slate-900/5">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-sm font-bold text-slate-950">Batch Actions</h2>
            <p className="mt-1 text-xs text-slate-500">
              Create a new batch or bulk import from Excel.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <FiPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Create Batch
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Configure a new batch with sections and NOS.
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
                    Import multiple batches from an .xlsx file.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* end grid */}

      {batchToPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-7 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FiSend className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-semibold text-slate-950 mb-2">
              Publish Batch Test?
            </h3>

            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to finalize and publish{" "}
              <strong className="text-slate-900">
                "{batchToPublish.name}"
              </strong>
              ? Once published, candidate configurations will be frozen and test
              visibility settings will be activated.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBatchToPublish(null)}
                disabled={isPublishing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPublishing ? "Publishing..." : "Confirm Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
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
              </div>

              {/* Authorization toggles */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Authorization Required
                </p>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      {
                        key: "is_authorization_required_in_theory" as const,
                        label: "Theory",
                        marksKey: null,
                      },
                      {
                        key: "is_authorization_required_in_practical" as const,
                        label: "Practical",
                        marksKey: "total_practical_marks" as const,
                      },
                      {
                        key: "is_authorization_required_in_viva" as const,
                        label: "Viva",
                        marksKey: "total_viva_marks" as const,
                      },
                    ] as const
                  )
                    .filter(
                      ({ marksKey }) =>
                        marksKey === null ||
                        Number(selectedJobRole?.[marksKey]) > 0 ||
                        (modalMode === "edit" &&
                          form[
                            marksKey === "total_practical_marks"
                              ? "is_authorization_required_in_practical"
                              : "is_authorization_required_in_viva"
                          ])
                    )
                    .map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form[key]}
                          onClick={() => setFormField(key, !form[key])}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 ${
                            form[key] ? "bg-slate-950" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              form[key] ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-semibold text-slate-700">
                          {label}
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Onboarding Selfie toggles */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Onboarding Selfie Required
                </p>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      {
                        key: "is_onboarding_selfie_required_theory" as const,
                        label: "Theory",
                      },
                      {
                        key: "is_onboarding_selfie_required_practical" as const,
                        label: "Practical",
                      },
                      {
                        key: "is_onboarding_selfie_required_viva" as const,
                        label: "Viva",
                      },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form[key]}
                        onClick={() => setFormField(key, !form[key])}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 ${
                          form[key] ? "bg-slate-950" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            form[key] ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Random Evidence toggles */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Random Evidence Required
                </p>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      {
                        key: "is_random_evidence_required_theory" as const,
                        label: "Theory",
                      },
                      {
                        key: "is_random_evidence_required_practical" as const,
                        label: "Practical",
                      },
                      {
                        key: "is_random_evidence_required_viva" as const,
                        label: "Viva",
                      },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form[key]}
                        onClick={() => setFormField(key, !form[key])}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 ${
                          form[key] ? "bg-slate-950" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            form[key] ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time fields */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Time (minutes)
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Theory Time">
                    <input
                      type="number"
                      min={0}
                      value={form.theory_time ?? 0}
                      onChange={(e) =>
                        setFormField(
                          "theory_time",
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className={INPUT_CLASS}
                      placeholder="0"
                    />
                  </Field>
                  {(Number(selectedJobRole?.total_practical_marks) > 0 ||
                    (modalMode === "edit" &&
                      (form.practical_time ?? 0) > 0)) && (
                    <Field label="Practical Time">
                      <input
                        type="number"
                        min={0}
                        value={form.practical_time ?? 0}
                        onChange={(e) =>
                          setFormField(
                            "practical_time",
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className={INPUT_CLASS}
                        placeholder="0"
                      />
                    </Field>
                  )}
                  {(Number(selectedJobRole?.total_viva_marks) > 0 ||
                    (modalMode === "edit" && (form.viva_time ?? 0) > 0)) && (
                    <Field label="Viva Time">
                      <input
                        type="number"
                        min={0}
                        value={form.viva_time ?? 0}
                        onChange={(e) =>
                          setFormField(
                            "viva_time",
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className={INPUT_CLASS}
                        placeholder="0"
                      />
                    </Field>
                  )}
                </div>
              </div>

              {form.job_role_id && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {jobRoleDetailLoading ? (
                    "Loading NOS and PC details for selected job role..."
                  ) : selectedJobRole ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <span>{selectedNosList.length} NOS available</span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        Theory:{" "}
                        {Number(selectedJobRole.total_theory_marks) || 0}
                      </span>
                      {Number(selectedJobRole.total_practical_marks) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Practical:{" "}
                          {Number(selectedJobRole.total_practical_marks)}
                        </span>
                      )}
                      {Number(selectedJobRole.total_viva_marks) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          Viva: {Number(selectedJobRole.total_viva_marks)}
                        </span>
                      )}
                    </div>
                  ) : (
                    `Select a job role to load NOS details.`
                  )}
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
                {form.sections
                  .filter((section) => {
                    if (section.type === "practical")
                      return (
                        Number(selectedJobRole?.total_practical_marks) > 0 ||
                        modalMode === "edit"
                      );
                    if (section.type === "viva")
                      return (
                        Number(selectedJobRole?.total_viva_marks) > 0 ||
                        modalMode === "edit"
                      );
                    return true;
                  })
                  .map((section) => {
                    const sectionIndex = form.sections.indexOf(section);
                    return (
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
                              {SECTION_TYPES.filter((type) => {
                                if (type === "practical")
                                  return (
                                    Number(
                                      selectedJobRole?.total_practical_marks
                                    ) > 0
                                  );
                                if (type === "viva")
                                  return (
                                    Number(selectedJobRole?.total_viva_marks) >
                                    0
                                  );
                                return true;
                              }).map((type) => (
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
                                    nos_list: [
                                      ...section.nos_list,
                                      createNos(),
                                    ],
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
                                <div className="flex items-center gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    NOS {nosIndex + 1}
                                    {nos.nos_code && (
                                      <span className="ml-2 normal-case tracking-normal text-slate-500">
                                        ({nos.nos_code})
                                      </span>
                                    )}
                                  </p>
                                  {nos.nos_code &&
                                    (() => {
                                      const matchedNos = selectedNosList.find(
                                        (jobRoleNos) =>
                                          getNosCode(jobRoleNos) ===
                                          nos.nos_code
                                      );
                                      if (!matchedNos) return null;
                                      return (
                                        <div className="flex items-center gap-1.5">
                                          {Number(
                                            matchedNos.total_theory_marks
                                          ) > 0 && (
                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                                              T:{matchedNos.total_theory_marks}
                                            </span>
                                          )}
                                          {Number(
                                            matchedNos.total_practical_marks
                                          ) > 0 && (
                                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                              P:
                                              {matchedNos.total_practical_marks}
                                            </span>
                                          )}
                                          {Number(matchedNos.total_viva_marks) >
                                            0 && (
                                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                              V:{matchedNos.total_viva_marks}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeNos(sectionIndex, nosIndex)
                                  }
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
                                      {questionCounts[nos.topic_id] ??
                                        "Loading..."}
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
                                      {questionCounts[nos.topic_id] ===
                                      undefined
                                        ? "Loading..."
                                        : `of ${
                                            questionCounts[nos.topic_id]
                                          } available`}
                                    </span>
                                  )}
                                  {nos.topic_id &&
                                    questionCounts[nos.topic_id] !==
                                      undefined &&
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
                                    const pcOptions =
                                      selectedNos?.pc_list || [];

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
                                              <option value="">
                                                Select PC
                                              </option>
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
                                                  correct_mark:
                                                    event.target.value,
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
                                                  negative_mark:
                                                    event.target.value,
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
                                    No PC rows added. Use Add PC when this NOS
                                    needs PC-level marks.
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
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
              <div
                className={`grid ${
                  bulkJobRoleId ? "grid-cols-2" : "grid-cols-1"
                } gap-3`}
              >
                {bulkJobRoleId && (
                  <button
                    type="button"
                    onClick={() =>
                      selectedJobRole &&
                      downloadBatchesTemplate(selectedJobRole)
                    }
                    disabled={jobRoleDetailLoading || !selectedJobRole}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    <FiDownload className="h-4 w-4" />
                    {jobRoleDetailLoading ? "Loading..." : "Template"}
                  </button>
                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <h2 className="text-xl font-semibold text-slate-950">
                Batch Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  setRevealedPasswords({});
                  setLoadingPasswords({});
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
                  <div className="flex justify-between items-start">
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
                  </div>

                  {/* Candidate Exam Link */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 mb-2">
                      Candidate Exam Link
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-xl border border-sky-200 bg-white px-3 py-2.5">
                        <p className="truncate text-xs font-mono text-slate-600">
                          {`${process.env.NEXT_PUBLIC_CANDIDATE_APP_URL || 'http://localhost:3002'}/batches/${selectedBatch.id}/exam/login`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${process.env.NEXT_PUBLIC_CANDIDATE_APP_URL || 'http://localhost:3002'}/batches/${selectedBatch.id}/exam/login`;
                          navigator.clipboard.writeText(url);
                          toast.success('Exam link copied to clipboard!');
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        title="Copy Link"
                      >
                        <FiCopy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                      <a
                        href={`${process.env.NEXT_PUBLIC_CANDIDATE_APP_URL || 'http://localhost:3002'}/batches/${selectedBatch.id}/exam/login`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        title="Open Exam Link"
                      >
                        <FiExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                     
                    </div>
                  </div>

                  <div className="flex border-b border-slate-100 gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setDetailsTab("structure")}
                      className={`border-b-2 pb-3 text-sm font-semibold transition ${
                        detailsTab === "structure"
                          ? "border-slate-950 text-slate-950"
                          : "border-transparent text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      Structure & Sections
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsTab("candidates")}
                      className={`border-b-2 pb-3 text-sm font-semibold transition ${
                        detailsTab === "candidates"
                          ? "border-slate-950 text-slate-950"
                          : "border-transparent text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      Candidates ({batchCandidates.length})
                    </button>
                  </div>

                  {detailsTab === "structure" && (
                    <div className="space-y-5">
                      <TestDetailsSection
                        test={selectedBatch.theory_test}
                        type="theory"
                      />
                      <TestDetailsSection
                        test={selectedBatch.practical_test}
                        type="practical"
                      />
                      <TestDetailsSection
                        test={selectedBatch.viva_test}
                        type="viva"
                      />
                    </div>
                  )}

                  {detailsTab === "candidates" && (
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
                              <div
                                key={idx}
                                className="flex gap-3 items-center"
                              >
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
                                        manualCandidates.filter(
                                          (_, i) => i !== idx
                                        )
                                      );
                                    }
                                  }}
                                  disabled={manualCandidates.length <= 1}
                                  className="rounded-xl border border-red-200 p-3 text-red-600 transition hover:bg-red-50 disabled:opacity-40 animate-in fade-in duration-200"
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
                                {candidatesLoading
                                  ? "Saving..."
                                  : "Save Candidates"}
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
                              <FiDownload className="h-3.5 w-3.5" /> Download
                              Template
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
                            <div className="space-y-3 animate-in zoom-in-95 duration-200">
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
                                    excelValidationErrors.some(
                                      (e) => e.type === "error"
                                    ) ||
                                    excelParsedCandidates.length === 0
                                  }
                                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                                >
                                  {candidatesLoading
                                    ? "Saving..."
                                    : "Save Candidates"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Registered Candidates
                            </span>
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
                            <div className="overflow-hidden rounded-2xl border border-slate-150 shadow-sm">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50/70 border-b border-slate-150">
                                  <tr>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      ID
                                    </th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Enrollment No
                                    </th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Password
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {batchCandidates.map((cand, idx) => (
                                    <tr
                                      key={cand.id || idx}
                                      className="hover:bg-slate-50/50 transition-colors"
                                    >
                                      <td className="px-5 py-3 text-xs font-medium text-slate-400">
                                        {idx + 1}
                                      </td>
                                      <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                                        {cand.enrollment_no}
                                      </td>
                                      <td className="px-5 py-3 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                          <code className="bg-slate-50 rounded px-2 py-0.5 font-mono text-[11px] border border-slate-100 min-w-[80px] text-center inline-block">
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
                                Click Add Candidate or Upload Excel to register
                                candidates for this batch.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No batch selected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
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

      {slotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
          <form
            onSubmit={handleSlotSubmit}
            className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-7 shadow-2xl"
          >
            <h2 className="text-xl font-semibold text-slate-950 mb-4">
              Schedule Batch Slot
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Test Type
                </label>
                <select
                  value={slotForm.testType}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, testType: e.target.value })
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Select test type</option>
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                  <option value="viva">Viva</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={slotForm.startDateTime}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, startDateTime: e.target.value })
                  }
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={slotForm.endDateTime}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, endDateTime: e.target.value })
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setSlotModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSlot}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {isSubmittingSlot ? "Scheduling..." : "Save Slot"}
              </button>
            </div>
          </form>
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

function TestDetailsSection({ test, type }: { test: any; type: string }) {
  if (!test) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 capitalize">
            {type} Test
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {test.Name || `${type} Test`}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
          {test.time_in_minutes || 0} mins
        </span>
      </div>

      <div className="space-y-4">
        {(test.sections || []).map((sec: any) => (
          <div key={sec.id} className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {sec.Name || "Section"}
            </h5>
            <div className="space-y-3">
              {(sec.questions || []).map((q: any, qIdx: number) => {
                const metadata =
                  q.metadata && typeof q.metadata !== "string"
                    ? q.metadata
                    : null;
                return (
                  <div
                    key={q.id || qIdx}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          Question {qIdx + 1}
                        </span>
                        <div
                          className="text-slate-900 font-medium leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.text }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10 uppercase tracking-wide">
                          {q.nos?.code ||
                            q.nos?.nos_code ||
                            q.nos_code ||
                            "NOS"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800">
                          {q.correct_mark ? `+${q.correct_mark}` : "0"} Marks
                        </span>
                      </div>
                    </div>

                    {q.type === "mcq" && metadata?.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-50 mt-1">
                        {metadata.options.map((opt: any, optIdx: number) => (
                          <div
                            key={opt.id || optIdx}
                            className={`rounded-lg border px-3 py-2 text-left ${
                              opt.is_correct
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold"
                                : "border-slate-100 bg-slate-50/50 text-slate-600"
                            }`}
                          >
                            <span className="mr-1.5 opacity-60">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span
                              dangerouslySetInnerHTML={{ __html: opt.text }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
