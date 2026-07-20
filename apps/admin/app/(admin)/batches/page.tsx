// @ts-nocheck
"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BatchForm from "./BatchForm";
import {
  FiDownload,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiUserCheck,
  FiPlay,
  FiPause,
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
  BatchCreateRequest,
  BatchDifficultyLevel,
  BatchQuestionType,
  BatchSectionType,
  BatchTestRequest,
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
  deleteCandidatesFromBatch,
  resetCandidate,
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
import Tooltip from "@/components/Tooltip";

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

const ATTENDANCE_TEST_TYPES = [
  {
    value: "theory",
    label: "Theory",
    testKey: "theory_test",
    idKey: "theory_test_id",
  },
  {
    value: "practical",
    label: "Practical",
    testKey: "practical_test",
    idKey: "practical_test_id",
  },
  { value: "viva", label: "Viva", testKey: "viva_test", idKey: "viva_test_id" },
] as const;

function getAttendanceTestOptions(batch: any) {
  if (!batch) return [];
  return ATTENDANCE_TEST_TYPES.filter(
    (type) => Boolean(batch[type.testKey]) || Boolean(batch[type.idKey])
  );
}

// Canonicalize the status string from the API into a lookup key
// ("not initialized" → "not_initialized", "in_progress" stays).
function canonicalExamStatus(raw: any): string {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

// Only the statuses the API actually returns.
const EXAM_STATUS_META: Record<string, { label: string; badge: string }> = {
  not_initialized: {
    label: "Not Initialized",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  disconnected: {
    label: "Disconnected",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  paused: {
    label: "Paused",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  resume: {
    label: "Resume",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  authorized: {
    label: "Authorized",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  unauthorized: {
    label: "Unauthorized",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

function examStatusLabel(canonical: string): string {
  return (
    EXAM_STATUS_META[canonical]?.label ??
    canonical.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Relative "x ago" for the candidate's last heartbeat timestamp.
function formatHeartbeat(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 0) return date.toLocaleString();
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleString();
}

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

function getPcCode(pc: { code?: string; pc_code?: string }) {
  return pc.code || pc.pc_code || "";
}

// Which test types a batch actually has configured (so the slot scheduler
// only offers theory/practical/viva that carry marks). Falls back to all
// three if nothing can be detected on the batch object.
function getBatchTestTypeOptions(batch: any) {
  const types = [
    { value: "theory", label: "Theory" },
    { value: "practical", label: "Practical" },
    { value: "viva", label: "Viva" },
  ];
  const available = types.filter(
    (t) =>
      Boolean(batch?.[`${t.value}_test`]) ||
      Boolean(batch?.[`${t.value}_test_id`]) ||
      Number(batch?.[`total_${t.value}_marks`]) > 0 ||
      Number(batch?.[`${t.value}_time`]) > 0 ||
      (Array.isArray(batch?.sections) &&
        batch.sections.some((s: any) => s?.type === t.value))
  );
  return available.length ? available : types;
}

// A NOS belongs to a section only if it carries marks for that test type
// (theory section → NOS with theory marks, and so on).
function nosMatchesSectionType(nos: JobRoleNos, sectionType: BatchSectionType) {
  if (sectionType === "practical") {
    return Number(nos.total_practical_marks) > 0;
  }
  if (sectionType === "viva") {
    return Number(nos.total_viva_marks) > 0;
  }
  return Number(nos.total_theory_marks) > 0;
}

// Cache key for the "questions available in a NOS" lookup.
function nosCountKey(nosId: string | number, difficulty: string, type: string) {
  return `${nosId}__${difficulty}__${type}`;
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

function buildPayload(form: BatchFormState): BatchCreateRequest | null {
  if (!form.name.trim() || !form.job_role_id) {
    toast.error("Batch name, sector and job role are required.");
    return null;
  }

  const buildTest = (type: BatchSectionType): BatchTestRequest | undefined => {
    const sections = form.sections
      .filter((section) => section.type === type && section.name.trim())
      .map((section) => ({
        name: section.name.trim(),
        nos_list: section.nos_list
          .filter((nos) => nos.nos_code.trim())
          .map((nos) => {
            const pc_list = nos.pc_list
              .filter((pc) => pc.pc_code.trim())
              .map((pc) => ({
                pc_code: pc.pc_code.trim(),
                nos_code: pc.nos_code.trim() || nos.nos_code.trim(),
                question_type: pc.question_type,
                difficulty_lvl: pc.difficulty_lvl,
                correct_mark: numberOrZero(pc.correct_mark),
                question_count: numberOrZero(pc.question_count),
                negative_mark: numberOrZero(pc.negative_mark),
              }));

            return {
              nos_code: nos.nos_code.trim(),
              question_type: nos.question_type,
              difficulty_lvl: nos.difficulty_lvl,
              correct_mark: numberOrZero(nos.correct_mark),
              question_count: numberOrZero(nos.question_count),
              negative_mark: numberOrZero(nos.negative_mark),
              ...(pc_list.length ? { pc_list } : {}),
            };
          }),
      }))
      .filter((section) => section.nos_list.length);

    return sections.length ? { sections } : undefined;
  };

  const theory_test = buildTest("theory");
  const practical_test = buildTest("practical");
  const viva_test = buildTest("viva");

  if (!theory_test && !practical_test && !viva_test) {
    toast.error(
      "Add at least one NOS row inside a section before saving the batch."
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
    is_random_evidence_required_theory: form.is_random_evidence_required_theory,
    is_onboarding_selfie_required_practical:
      form.is_onboarding_selfie_required_practical,
    is_random_evidence_required_practical:
      form.is_random_evidence_required_practical,
    is_onboarding_selfie_required_viva: form.is_onboarding_selfie_required_viva,
    is_random_evidence_required_viva: form.is_random_evidence_required_viva,
    ...(theory_test ? { theory_test } : {}),
    ...(practical_test ? { practical_test } : {}),
    ...(viva_test ? { viva_test } : {}),
  };
}

export default function BatchesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
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
    deleting: candidatesDeleting,
    resetting: candidatesResetting,
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
  const [newSectionType, setNewSectionType] =
    useState<BatchSectionType>("theory");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSectorId, setBulkSectorId] = useState("");
  const [bulkJobRoleId, setBulkJobRoleId] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkMessages, setBulkMessages] = useState<string[]>([]);
  const [nosQuestionCounts, setNosQuestionCounts] = useState<
    Record<string, number>
  >({});
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
  const [attendanceTestType, setAttendanceTestType] = useState<
    "theory" | "practical" | "viva"
  >("theory");
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [schedulingBatchId, setSchedulingBatchId] = useState<
    string | number | null
  >(null);
  const [schedulingBatchDetail, setSchedulingBatchDetail] = useState<any>(null);
  const [slotForm, setSlotForm] = useState({
    testType: "THEORY",
    startDateTime: "",
    endDateTime: "",
  });
  const [isSubmittingSlot, setIsSubmittingSlot] = useState(false);
  const [batchToPublish, setBatchToPublish] = useState<Batch | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  // Resume/pause a candidate's test. `pause: false` resumes, `pause: true`
  // pauses. Needs the test id for the selected test type + the candidate id.
  const [pauseTestType, setPauseTestType] = useState<
    "theory" | "practical" | "viva"
  >("theory");
  const [pauseLoading, setPauseLoading] = useState<
    Record<string | number, boolean>
  >({});
  // Live status per test type (from the exam/status API), shown next to each
  // test in the structure (test info) tab.
  const [testStatuses, setTestStatuses] = useState<Record<string, string>>({});
  const [testStatusLoading, setTestStatusLoading] = useState(false);
  const attendanceTestOptions = useMemo(
    () => getAttendanceTestOptions(selectedBatch),
    [selectedBatch]
  );

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

  useEffect(() => {
    if (
      attendanceTestOptions.length > 0 &&
      !attendanceTestOptions.some((type) => type.value === attendanceTestType)
    ) {
      setAttendanceTestType(attendanceTestOptions[0].value);
    }
  }, [attendanceTestOptions, attendanceTestType]);

  // Keep the pause/resume test selection valid for the current batch.
  useEffect(() => {
    if (
      attendanceTestOptions.length > 0 &&
      !attendanceTestOptions.some((type) => type.value === pauseTestType)
    ) {
      setPauseTestType(attendanceTestOptions[0].value);
    }
  }, [attendanceTestOptions, pauseTestType]);

  // Fetch each test's status for the structure (test info) tab.
  useEffect(() => {
    if (!detailsOpen || detailsTab !== "structure" || !selectedBatch) {
      return;
    }
    const batchAny = selectedBatch as any;
    const types: ("theory" | "practical" | "viva")[] = [
      "theory",
      "practical",
      "viva",
    ];
    const targets = types
      .map((type) => ({
        type,
        testId:
          batchAny?.[`${type}_test`]?.id ??
          batchAny?.[`${type}_test_id`] ??
          null,
      }))
      .filter((target) => target.testId);

    if (!targets.length) {
      setTestStatuses({});
      return;
    }

    let active = true;
    setTestStatusLoading(true);
    Promise.all(
      targets.map(async ({ type, testId }) => {
        try {
          const res = await api.get(
            `/batches/${selectedBatch.id}/exam/status?test_id=${testId}`
          );
          const raw =
            res.data?.status ??
            res.data?.exam_status ??
            res.data?.data?.status ??
            res.data;
          return [type, canonicalExamStatus(raw)] as const;
        } catch {
          return [type, ""] as const;
        }
      })
    ).then((entries) => {
      if (!active) return;
      setTestStatuses(Object.fromEntries(entries.filter(([, s]) => s)));
      setTestStatusLoading(false);
    });

    return () => {
      active = false;
    };
  }, [detailsOpen, detailsTab, selectedBatch]);

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

  // Build a NOS list (with PCs) for a section, auto-loaded from the selected
  // job role's nos_list. Shared by the auto-populate effect and Add Section.
  const buildSectionNosList = (sectionType: BatchSectionType): NosForm[] => {
    const nosList = (selectedJobRole?.nos_list || []).filter((nos) =>
      nosMatchesSectionType(nos, sectionType)
    );
    if (!nosList.length) return [createNos()];
    const questionType: BatchQuestionType =
      sectionType === "practical" || sectionType === "viva" ? "rubric" : "mcq";
    const difficulty: BatchDifficultyLevel =
      sectionType === "practical" ? "medium" : "easy";
    return nosList.map((nos) => {
      const nosCode = getNosCode(nos);
      return createNos({
        nos_code: nosCode,
        question_count: "1",
        difficulty_lvl: difficulty,
        question_type: questionType,
        correct_mark: "0",
        negative_mark: "0",
        pc_list: (nos.pc_list || []).map((pc) =>
          createPc({
            pc_code: getPcCode(pc),
            nos_code: nosCode,
            question_count: "1",
            difficulty_lvl: difficulty,
            question_type: questionType,
            correct_mark: "0",
            negative_mark: "0",
          })
        ),
      });
    });
  };

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

    const sections: SectionForm[] = [];
    if (hasTheory) {
      sections.push({
        name: "Theory Section",
        type: "theory",
        nos_list: buildSectionNosList("theory"),
      });
    }
    if (hasPractical) {
      sections.push({
        name: "Practical Section",
        type: "practical",
        nos_list: buildSectionNosList("practical"),
      });
    }
    if (hasViva) {
      sections.push({
        name: "Viva Section",
        type: "viva",
        nos_list: buildSectionNosList("viva"),
      });
    }
    // Fallback: at least one section
    if (!sections.length) {
      sections.push({
        name: "Section 1",
        type: "theory",
        nos_list: buildSectionNosList("theory"),
      });
    }

    setForm((current) => ({
      ...current,
      sections,
    }));
  }, [selectedJobRole, modalMode, jobRoleDetailLoading]);

  const loadNosQuestionCount = async (
    nosId: string | number,
    difficulty: string,
    type: string
  ) => {
    const key = nosCountKey(nosId, difficulty, type);
    if (!nosId || nosQuestionCounts[key] !== undefined) {
      return;
    }

    try {
      const response = await api.get("/questions", {
        params: {
          nos_id: nosId,
          difficulty_lvl: difficulty,
          type,
          page: 1,
          limit: 1000,
        },
      });
      setNosQuestionCounts((current) => ({
        ...current,
        [key]: getQuestionTotal(response.data),
      }));
    } catch {
      setNosQuestionCounts((current) => ({ ...current, [key]: 0 }));
    }
  };

  // Resolve a form NOS row back to its job-role NOS id (via nos_code).
  const getNosIdForCode = (nosCode: string) => {
    if (!nosCode) return undefined;
    const matched = selectedNosList.find(
      (jobRoleNos) => getNosCode(jobRoleNos) === nosCode
    );
    return matched?.id;
  };

  // Fetch the available-question count for every NOS row (per nos_id +
  // difficulty + type) so the Questions field can show live availability.
  useEffect(() => {
    if (!modalMode) {
      return;
    }

    form.sections.forEach((section) => {
      section.nos_list.forEach((nos) => {
        const nosId = getNosIdForCode(nos.nos_code);
        if (nosId) {
          void loadNosQuestionCount(
            nosId,
            nos.difficulty_lvl,
            nos.question_type
          );
        }
      });
    });
  }, [form.sections, modalMode, selectedNosList]);

  const refreshBatches = () => {
    dispatch(fetchBatches({ page: currentPage, limit: 10 }));
  };

  const handleCopyExamLink = async (batchId: string | number) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_CANDIDATE_APP_URL || "http://localhost:3002";
    const examLink = `${baseUrl}/batches/${batchId}/exam/login`;

    try {
      await navigator.clipboard.writeText(examLink);
      toast.success("Exam link copied to clipboard.");
    } catch {
      toast.error("Failed to copy exam link.");
    }
  };

  const schedulingBatchTestTypes = useMemo(
    () =>
      getBatchTestTypeOptions(
        schedulingBatchDetail ??
          batches.find((b) => String(b.id) === String(schedulingBatchId))
      ),
    [schedulingBatchDetail, batches, schedulingBatchId]
  );

  const handleOpenSlotModal = async (batchId: string | number) => {
    setSchedulingBatchId(batchId);
    setSlotForm({ testType: "", startDateTime: "", endDateTime: "" });
    setSchedulingBatchDetail(null);
    setSlotModalOpen(true);
    // Fetch full batch detail so we know which test types (theory/practical/
    // viva) actually exist for this batch.
    try {
      const res = await api.get(`/batches/${batchId}`);
      setSchedulingBatchDetail(res.data?.batch ?? res.data ?? null);
    } catch {
      setSchedulingBatchDetail(null);
    }
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
    router.push("/batches/create");
  };

  const openEditModal = (batch: Batch) => {
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

  const addNos = (sectionIndex: number) => {
    const section = form.sections[sectionIndex];
    updateSection(sectionIndex, {
      ...section,
      nos_list: [...section.nos_list, createNos()],
    });
  };

  const removeNos = (sectionIndex: number, nosIndex: number) => {
    const section = form.sections[sectionIndex];
    updateSection(sectionIndex, {
      ...section,
      nos_list: section.nos_list.filter((_, index) => index !== nosIndex),
    });
  };

  const handleNosCodeChange = (
    sectionIndex: number,
    nosIndex: number,
    nosCode: string
  ) => {
    const nos = form.sections[sectionIndex].nos_list[nosIndex];
    updateNos(sectionIndex, nosIndex, { ...nos, nos_code: nosCode });
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
    router.push(`/batches/batchdetails?batchId=${id}`);
  };

  const handleAddCandidates = (id: string | number) => {
    router.push(`/batches/candidates?batchId=${id}`);
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
      const response = await api.post(
        `/batches/${selectedBatch.id}/show-password`,
        {
          enrollment_no: enrollmentNo,
        }
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  // Resolve the test id for a given test type from the selected batch.
  const getTestIdForType = (type: "theory" | "practical" | "viva") => {
    const batch = selectedBatch as any;
    return batch?.[`${type}_test`]?.id ?? batch?.[`${type}_test_id`] ?? null;
  };

  const handleResumeOrPause = async (
    candidateId: string | number,
    pause: boolean
  ) => {
    if (!selectedBatch) return;
    const testId = getTestIdForType(pauseTestType);
    if (!testId) {
      toast.error("No test is available to pause/resume for this batch.");
      return;
    }

    setPauseLoading((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const res = await api.post(
        `/batches/${selectedBatch.id}/resume-or-pause`,
        {
          pause,
          test_id: testId,
          candidate_id: candidateId,
        }
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
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-700 flex-col gap-6 lg:h-full lg:min-h-0">
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

      <div className="grid min-h-0 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                          <Tooltip label="View Batch">
                            <button
                              onClick={() => handleView(batch.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              <FiEye className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Add Candidates">
                            <button
                              onClick={() => handleAddCandidates(batch.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <FiUsers className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Configure Batch Time">
                            <button
                              onClick={() => handleOpenSlotModal(batch.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                            >
                              <FiCalendar className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>

                          <Tooltip label="Copy Exam Link">
                            <button
                              onClick={() => handleCopyExamLink(batch.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
                            >
                              <FiCopy className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip>

                          {!batch.is_published && (
                            <Tooltip label="Publish Batch">
                              <button
                                onClick={() => handleOpenPublishModal(batch)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
                              >
                                <FiSend className="h-4.5 w-4.5" />
                              </button>
                            </Tooltip>
                          )}
                          {/* <Tooltip label="Delete Batch">
                            <button
                              onClick={() => setBatchToDelete(batch)}
                              disabled={deleting}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-4.5 w-4.5" />
                            </button>
                          </Tooltip> */}
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
      {modalMode === "edit" && batchToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 modal-overlay">
          <BatchForm
            mode="edit"
            batch={batchToEdit}
            onSuccess={() => {
              closeFormModal();
              refreshBatches();
            }}
            onCancel={closeFormModal}
          />
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
                  {schedulingBatchTestTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
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

function TestDetailsSection({
  test,
  type,
  status,
  statusLoading,
}: {
  test: any;
  type: string;
  status?: string;
  statusLoading?: boolean;
}) {
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
        <div className="flex items-center gap-2">
          {statusLoading ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              …
            </span>
          ) : status ? (
            <span
              title="Test status"
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                EXAM_STATUS_META[status]?.badge ??
                "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {examStatusLabel(status)}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
            {test.time_in_minutes || 0} mins
          </span>
        </div>
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
