// @ts-nocheck
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  Batch,
  BatchCreateRequest,
  BatchDifficultyLevel,
  BatchQuestionType,
  BatchSectionType,
  BatchTestRequest,
  createBatches,
  updateBatch,
} from "@/store/slices/batches-slice";
import { fetchJobRoles, JobRoleNos } from "@/store/slices/jobroles-slice";
import { fetchSectors } from "@/store/slices/sectors-slice";
import { fetchTopics } from "@/store/slices/topics-slice";
import api from "@/lib/api";

/* ── Form types ──────────────────────────────────────── */

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

/* ── Factories & helpers ─────────────────────────────── */

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
    name: "Section#1",
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

function nosMatchesSectionType(nos: JobRoleNos, sectionType: BatchSectionType) {
  if (sectionType === "practical") {
    return Number(nos.total_practical_marks) > 0;
  }
  if (sectionType === "viva") {
    return Number(nos.total_viva_marks) > 0;
  }
  return Number(nos.total_theory_marks) > 0;
}

function nosCountKey(nosId: string | number, difficulty: string, type: string) {
  return `${nosId}__${difficulty}__${type}`;
}

function getQuestionTotal(data: any): number {
  if (Array.isArray(data)) return data.length;
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

/* ── Component ───────────────────────────────────────── */

export default function BatchForm({
  mode,
  batch,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  batch?: Batch | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const dispatch = useAppDispatch();
  const { jobRoles } = useAppSelector((state) => state.jobRoles);
  const { sectors } = useAppSelector((state) => state.sectors);
  const { creating, updating } = useAppSelector((state) => state.batches);

  const [form, setForm] = useState<BatchFormState>(() =>
    mode === "edit" && batch ? normalizeBatchToForm(batch) : createEmptyForm()
  );
  const [newSectionType, setNewSectionType] =
    useState<BatchSectionType>("theory");
  const [nosQuestionCounts, setNosQuestionCounts] = useState<
    Record<string, number>
  >({});

  // Job role detail is fetched locally (not via the shared redux slice) so the
  // form is self-contained and doesn't clash with the batches list page.
  const [selectedJobRole, setSelectedJobRole] = useState<any>(null);
  const [jobRoleDetailLoading, setJobRoleDetailLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchSectors({ page: 1, limit: 1000 }));
    dispatch(fetchJobRoles({ page: 1, limit: 1000 }));
    dispatch(fetchTopics({ page: 1, limit: 1000 }));
  }, [dispatch]);

  // In edit mode, fill the sector from the job role list once it loads.
  useEffect(() => {
    if (mode !== "edit" || !batch || !jobRoles.length) return;
    const jr = jobRoles.find(
      (item) => String(item.id) === String(batch.job_role_id)
    );
    if (jr) {
      setForm((cur) =>
        cur.sector_id ? cur : { ...cur, sector_id: String(jr.sector_id || "") }
      );
    }
  }, [mode, batch, jobRoles]);

  // Load the selected job role's NOS/PC detail.
  useEffect(() => {
    if (!form.job_role_id) {
      setSelectedJobRole(null);
      return;
    }
    let active = true;
    setJobRoleDetailLoading(true);
    api
      .get(`/jobroles/${form.job_role_id}`)
      .then((res) => {
        if (active) setSelectedJobRole(res.data?.jobrole ?? res.data ?? null);
      })
      .catch(() => {
        if (active) setSelectedJobRole(null);
      })
      .finally(() => {
        if (active) setJobRoleDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.job_role_id]);

  const filteredJobRoles = useMemo(
    () =>
      form.sector_id
        ? jobRoles.filter(
            (jobRole) => String(jobRole.sector_id) === form.sector_id
          )
        : jobRoles,
    [form.sector_id, jobRoles]
  );

  const selectedNosList = useMemo(
    () => selectedJobRole?.nos_list || [],
    [selectedJobRole]
  );

  const buildSectionNosList = (sectionType: BatchSectionType): NosForm[] => {
    const nosList = (selectedJobRole?.nos_list || []).filter((nos: any) =>
      nosMatchesSectionType(nos, sectionType)
    );
    if (!nosList.length) return [createNos()];
    const questionType: BatchQuestionType =
      sectionType === "practical" || sectionType === "viva" ? "rubric" : "mcq";
    const difficulty: BatchDifficultyLevel =
      sectionType === "practical" ? "medium" : "easy";
    return nosList.map((nos: any) => {
      const nosCode = getNosCode(nos);
      return createNos({
        nos_code: nosCode,
        question_count: "1",
        difficulty_lvl: difficulty,
        question_type: questionType,
        correct_mark: "0",
        negative_mark: "0",
        pc_list: (nos.pc_list || []).map((pc: any) =>
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

  // Auto-populate sections and NOS when a job role is selected (create mode).
  useEffect(() => {
    if (mode !== "create" || !selectedJobRole || jobRoleDetailLoading) {
      return;
    }

    const nosList = selectedJobRole.nos_list || [];
    const hasTheory =
      nosList.some((nos: any) => Number(nos.total_theory_marks) > 0) ||
      Number(selectedJobRole.total_theory_marks) > 0;
    const hasPractical =
      nosList.some((nos: any) => Number(nos.total_practical_marks) > 0) ||
      Number(selectedJobRole.total_practical_marks) > 0;
    const hasViva =
      nosList.some((nos: any) => Number(nos.total_viva_marks) > 0) ||
      Number(selectedJobRole.total_viva_marks) > 0;

    const sections: SectionForm[] = [];
    if (hasTheory) {
      sections.push({
        name: "Section#1",
        type: "theory",
        nos_list: buildSectionNosList("theory"),
      });
    }
    if (hasPractical) {
      sections.push({
        name: "Section#1",
        type: "practical",
        nos_list: buildSectionNosList("practical"),
      });
    }
    if (hasViva) {
      sections.push({
        name: "Section#1",
        type: "viva",
        nos_list: buildSectionNosList("viva"),
      });
    }
    if (!sections.length) {
      sections.push({
        name: "Section#1",
        type: "theory",
        nos_list: buildSectionNosList("theory"),
      });
    }

    setForm((current) => ({ ...current, sections }));
  }, [selectedJobRole, mode, jobRoleDetailLoading]);

  const loadNosQuestionCount = async (
    nosId: string | number,
    difficulty: string,
    type: string
  ) => {
    const key = nosCountKey(nosId, difficulty, type);
    if (!nosId || nosQuestionCounts[key] !== undefined) return;

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

  const getNosIdForCode = (nosCode: string) => {
    if (!nosCode) return undefined;
    const matched = selectedNosList.find(
      (jobRoleNos: any) => getNosCode(jobRoleNos) === nosCode
    );
    return matched?.id;
  };

  useEffect(() => {
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
  }, [form.sections, selectedNosList]);

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
    if (!payload) return;

    const resultAction =
      mode === "edit" && batch
        ? await dispatch(updateBatch({ id: batch.id, ...payload }))
        : await dispatch(createBatches([payload]));

    if (
      (mode === "edit" && updateBatch.fulfilled.match(resultAction)) ||
      (mode === "create" && createBatches.fulfilled.match(resultAction))
    ) {
      onSuccess();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {mode === "edit" ? "Edit Batch" : "Create Batch"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select sector and job role, then fill section, NOS and PC details.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
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
              onChange={(event) => setFormField("name", event.target.value)}
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
        <ToggleGroup
          title="Authorization Required"
          prefix="is_authorization_required_in"
          form={form}
          setFormField={setFormField}
          selectedJobRole={selectedJobRole}
          mode={mode}
        />

        {/* Onboarding Selfie toggles */}
        <ToggleGroup
          title="Onboarding Selfie Required"
          prefix="is_onboarding_selfie_required"
          form={form}
          setFormField={setFormField}
          selectedJobRole={selectedJobRole}
          mode={mode}
        />

        {/* Random Evidence toggles */}
        <ToggleGroup
          title="Random Evidence Required"
          prefix="is_random_evidence_required"
          form={form}
          setFormField={setFormField}
          selectedJobRole={selectedJobRole}
          mode={mode}
        />

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
                onWheel={(e) => e.currentTarget.blur()}
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
              (mode === "edit" && (form.practical_time ?? 0) > 0)) && (
              <Field label="Practical Time">
                <input
                  type="number"
                  min={0}
                  onWheel={(e) => e.currentTarget.blur()}
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
              (mode === "edit" && (form.viva_time ?? 0) > 0)) && (
              <Field label="Viva Time">
                <input
                  type="number"
                  min={0}
                  onWheel={(e) => e.currentTarget.blur()}
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
                  Theory: {Number(selectedJobRole.total_theory_marks) || 0}
                </span>
                {Number(selectedJobRole.total_practical_marks) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Practical: {Number(selectedJobRole.total_practical_marks)}
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Test Structure
            </p>
            <p className="mt-1 text-xs text-slate-400">
              NOS and PCs are loaded automatically from the selected job role.
              Just set the question count, difficulty, type, and marks.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={newSectionType}
              onChange={(event) =>
                setNewSectionType(event.target.value as BatchSectionType)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 outline-none transition focus:border-slate-400"
            >
              {SECTION_TYPES.filter((type) => {
                if (type === "practical")
                  return (
                    Number(selectedJobRole?.total_practical_marks) > 0 ||
                    mode === "edit"
                  );
                if (type === "viva")
                  return (
                    Number(selectedJobRole?.total_viva_marks) > 0 ||
                    mode === "edit"
                  );
                return true;
              }).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setForm((current) => {
                  const count = current.sections.filter(
                    (s) => s.type === newSectionType
                  ).length;
                  return {
                    ...current,
                    sections: [
                      {
                        name: `Section#${count + 1}`,
                        type: newSectionType,
                        nos_list: buildSectionNosList(newSectionType),
                      },
                      ...current.sections,
                    ],
                  };
                })
              }
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Add Section
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-5">
          {form.sections
            .filter((section) => {
              if (section.type === "practical")
                return (
                  Number(selectedJobRole?.total_practical_marks) > 0 ||
                  mode === "edit"
                );
              if (section.type === "viva")
                return (
                  Number(selectedJobRole?.total_viva_marks) > 0 ||
                  mode === "edit"
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
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={section.name}
                      onChange={(event) =>
                        updateSection(sectionIndex, {
                          ...section,
                          name: event.target.value,
                        })
                      }
                      className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400"
                    />
                    <select
                      value={section.type}
                      onChange={(event) =>
                        updateSection(sectionIndex, {
                          ...section,
                          type: event.target.value as BatchSectionType,
                        })
                      }
                      className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      {SECTION_TYPES.filter((type) => {
                        if (type === "practical")
                          return (
                            Number(selectedJobRole?.total_practical_marks) >
                              0 || mode === "edit"
                          );
                        if (type === "viva")
                          return (
                            Number(selectedJobRole?.total_viva_marks) > 0 ||
                            mode === "edit"
                          );
                        return true;
                      }).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] font-medium text-slate-400">
                      {section.nos_list.length} NOS
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSection(sectionIndex)}
                      disabled={form.sections.length <= 1}
                      title="Remove section"
                      className="ml-auto shrink-0 rounded-xl border border-red-100 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {section.nos_list.map((nos, nosIndex) => (
                      <div
                        key={`${sectionIndex}-${nosIndex}`}
                        className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex flex-1 items-center gap-3">
                            <select
                              value={nos.nos_code}
                              onChange={(event) =>
                                handleNosCodeChange(
                                  sectionIndex,
                                  nosIndex,
                                  event.target.value
                                )
                              }
                              className="max-w-[240px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                            >
                              <option value="">Select NOS</option>
                              {selectedNosList
                                .filter((jobRoleNos: any) =>
                                  nosMatchesSectionType(
                                    jobRoleNos,
                                    section.type
                                  )
                                )
                                .map((jobRoleNos: any) => {
                                  const code = getNosCode(jobRoleNos);
                                  return (
                                    <option key={code} value={code}>
                                      {code}
                                      {jobRoleNos.name
                                        ? ` — ${jobRoleNos.name}`
                                        : ""}
                                    </option>
                                  );
                                })}
                            </select>
                            {nos.nos_code &&
                              (() => {
                                const matchedNos = selectedNosList.find(
                                  (jobRoleNos: any) =>
                                    getNosCode(jobRoleNos) === nos.nos_code
                                );
                                if (!matchedNos) return null;
                                const mark =
                                  section.type === "practical"
                                    ? matchedNos.total_practical_marks
                                    : section.type === "viva"
                                    ? matchedNos.total_viva_marks
                                    : matchedNos.total_theory_marks;
                                const label =
                                  section.type === "practical"
                                    ? "P"
                                    : section.type === "viva"
                                    ? "V"
                                    : "T";
                                const total = Number(mark) || 0;
                                const consumed = form.sections.reduce(
                                  (sum, sec) => {
                                    if (sec.type !== section.type) return sum;
                                    return (
                                      sum +
                                      sec.nos_list.reduce(
                                        (rowSum, rowNos) =>
                                          rowNos.nos_code === nos.nos_code
                                            ? rowSum +
                                              (Number(rowNos.correct_mark) ||
                                                0) *
                                                (Number(
                                                  rowNos.question_count
                                                ) || 0)
                                            : rowSum,
                                        0
                                      )
                                    );
                                  },
                                  0
                                );
                                const remaining = total - consumed;
                                const over = remaining < 0;
                                const badgeClass = over
                                  ? "bg-red-50 text-red-600"
                                  : section.type === "practical"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : section.type === "viva"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-blue-50 text-blue-600";
                                return (
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}
                                    title={`${consumed} of ${total} marks allocated`}
                                  >
                                    {label}: {remaining}/{total} left
                                  </span>
                                );
                              })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNos(sectionIndex, nosIndex)}
                            title="Remove NOS"
                            className="shrink-0 rounded-lg border border-red-100 bg-white p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                          <Field label="Questions">
                            <input
                              type="number"
                              value={nos.question_count}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(event) =>
                                updateNos(sectionIndex, nosIndex, {
                                  ...nos,
                                  question_count: event.target.value,
                                })
                              }
                              className={INPUT_CLASS}
                            />
                            {(() => {
                              const nosId = getNosIdForCode(nos.nos_code);
                              if (!nosId) return null;
                              const count =
                                nosQuestionCounts[
                                  nosCountKey(
                                    nosId,
                                    nos.difficulty_lvl,
                                    nos.question_type
                                  )
                                ];
                              const exceeds =
                                count !== undefined &&
                                Number(nos.question_count) > count;
                              return (
                                <span
                                  className={`mt-1 block text-[11px] font-medium ${
                                    exceeds ? "text-red-500" : "text-slate-400"
                                  }`}
                                >
                                  {count === undefined
                                    ? "Checking availability…"
                                    : `${count} question${
                                        count === 1 ? "" : "s"
                                      } available`}
                                  {exceeds ? " — exceeds available" : ""}
                                </span>
                              );
                            })()}
                          </Field>
                          <Field label="Correct Mark">
                            <input
                              type="number"
                              value={nos.correct_mark}
                              onWheel={(e) => e.currentTarget.blur()}
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
                              onWheel={(e) => e.currentTarget.blur()}
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

                        {nos.pc_list.length > 0 && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              Performance Criteria ({nos.pc_list.length})
                            </p>
                            <div className="space-y-2">
                              {nos.pc_list.map((pc, pcIndex) => (
                                <div
                                  key={`${sectionIndex}-${nosIndex}-${pcIndex}`}
                                  className="rounded-lg border border-slate-100 bg-white p-2.5"
                                >
                                  <p className="mb-2 text-[11px] font-semibold text-slate-600">
                                    {pc.pc_code || `PC ${pcIndex + 1}`}
                                  </p>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                    <input
                                      type="number"
                                      value={pc.question_count}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      onChange={(event) =>
                                        updatePc(
                                          sectionIndex,
                                          nosIndex,
                                          pcIndex,
                                          {
                                            ...pc,
                                            question_count: event.target.value,
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
                                      onWheel={(e) => e.currentTarget.blur()}
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
                                      onWheel={(e) => e.currentTarget.blur()}
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
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addNos(sectionIndex)}
                    title="Add NOS"
                    className="mt-3 inline-flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-2 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 px-7 py-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={creating || updating}
          className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {mode === "edit"
            ? updating
              ? "Updating..."
              : "Update Batch"
            : creating
            ? "Creating..."
            : "Create Batch"}
        </button>
      </div>
    </form>
  );
}

/* ── Toggle group (auth / selfie / evidence) ─────────── */

function ToggleGroup({
  title,
  prefix,
  form,
  setFormField,
  selectedJobRole,
  mode,
}: {
  title: string;
  prefix: string;
  form: BatchFormState;
  setFormField: (field: any, value: any) => void;
  selectedJobRole: any;
  mode: "create" | "edit";
}) {
  const items = [
    { key: `${prefix}_theory`, label: "Theory", marksKey: null },
    {
      key: `${prefix}_practical`,
      label: "Practical",
      marksKey: "total_practical_marks",
    },
    { key: `${prefix}_viva`, label: "Viva", marksKey: "total_viva_marks" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-4">
        {items
          .filter(
            ({ marksKey, key }) =>
              marksKey === null ||
              Number(selectedJobRole?.[marksKey]) > 0 ||
              (mode === "edit" && form[key])
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
  );
}
