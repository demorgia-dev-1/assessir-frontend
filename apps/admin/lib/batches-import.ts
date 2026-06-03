import * as XLSX from "xlsx";
import type {
  BatchDifficultyLevel,
  BatchPayload,
  BatchQuestionType,
  BatchSectionType,
} from "@/store/slices/batches-slice";

export interface BatchValidationError {
  type: "error" | "warning";
  message: string;
  details?: string;
}

export interface ParseBatchesResult {
  batches: BatchPayload[];
  errors: BatchValidationError[];
}

const BATCHES_SHEET = "Batches";
const SECTIONS_SHEET = "Sections";
const NOS_SHEET = "NOS";
const PCS_SHEET = "PCs";

const BATCH_HEADERS = [
  "batch_key",
  "name",
  "theory_time",
  "practical_time",
  "viva_time",
] as const;

const SECTION_HEADERS = [
  "batch_key",
  "section_key",
  "name",
  "type",
] as const;

const NOS_HEADERS = [
  "section_key",
  "nos_key",
  "topic_id",
  "nos_code",
  "question_count",
  "difficulty_lvl",
  "question_type",
  "correct_mark",
  "negative_mark",
] as const;

const PC_HEADERS = [
  "nos_key",
  "topic_id",
  "nos_code",
  "pc_code",
  "question_count",
  "difficulty_lvl",
  "question_type",
  "correct_mark",
  "negative_mark",
] as const;

const TEMPLATE_BATCHES = [
  {
    batch_key: "react-batch-1",
    name: "React Batch 1",
    theory_time: 30,
    practical_time: 30,
    viva_time: 30,
  },
];

const TEMPLATE_SECTIONS = [
  {
    batch_key: "react-batch-1",
    section_key: "react-batch-1-theory",
    name: "Theory Section",
    type: "theory",
  },
  {
    batch_key: "react-batch-1",
    section_key: "react-batch-1-practical",
    name: "Practical Section",
    type: "practical",
  },
  {
    batch_key: "react-batch-1",
    section_key: "react-batch-1-viva",
    name: "Viva Section",
    type: "viva",
  },
];

const TEMPLATE_NOS = [
  {
    section_key: "react-batch-1-theory",
    nos_key: "theory-nos-1",
    topic_id: 1,
    nos_code: "NOS-REACT-001",
    question_count: 1,
    difficulty_lvl: "easy",
    question_type: "mcq",
    correct_mark: 0,
    negative_mark: 0,
  },
  {
    section_key: "react-batch-1-theory",
    nos_key: "theory-nos-2",
    topic_id: 1,
    nos_code: "NOS-REACT-002",
    question_count: 1,
    difficulty_lvl: "easy",
    question_type: "mcq",
    correct_mark: 0,
    negative_mark: 0,
  },
  {
    section_key: "react-batch-1-practical",
    nos_key: "practical-nos-1",
    topic_id: 1,
    nos_code: "NOS-REACT-001",
    question_count: 1,
    difficulty_lvl: "medium",
    question_type: "rubric",
    correct_mark: 0,
    negative_mark: 0,
  },
  {
    section_key: "react-batch-1-practical",
    nos_key: "practical-nos-2",
    topic_id: 1,
    nos_code: "NOS-REACT-002",
    question_count: 1,
    difficulty_lvl: "medium",
    question_type: "rubric",
    correct_mark: 0,
    negative_mark: 0,
  },
  {
    section_key: "react-batch-1-viva",
    nos_key: "viva-nos-1",
    topic_id: 1,
    nos_code: "NOS-REACT-001",
    question_count: 1,
    difficulty_lvl: "easy",
    question_type: "mcq",
    correct_mark: 0,
    negative_mark: 0,
  },
  {
    section_key: "react-batch-1-viva",
    nos_key: "viva-nos-2",
    topic_id: 1,
    nos_code: "NOS-REACT-002",
    question_count: 1,
    difficulty_lvl: "easy",
    question_type: "mcq",
    correct_mark: 0,
    negative_mark: 0,
  },
];

const TEMPLATE_PCS = [
  ["theory-nos-1", "NOS-REACT-001", "PC-REACT-001", "easy", "mcq", 7],
  ["theory-nos-1", "NOS-REACT-001", "PC-REACT-002", "easy", "mcq", 8],
  ["theory-nos-2", "NOS-REACT-002", "PC-REACT-003", "easy", "mcq", 7],
  ["theory-nos-2", "NOS-REACT-002", "PC-REACT-004", "easy", "mcq", 8],
  ["practical-nos-1", "NOS-REACT-001", "PC-REACT-001", "medium", "rubric", 12],
  ["practical-nos-1", "NOS-REACT-001", "PC-REACT-002", "medium", "rubric", 13],
  ["practical-nos-2", "NOS-REACT-002", "PC-REACT-003", "medium", "rubric", 12],
  ["practical-nos-2", "NOS-REACT-002", "PC-REACT-004", "medium", "rubric", 13],
  ["viva-nos-1", "NOS-REACT-001", "PC-REACT-001", "easy", "mcq", 5],
  ["viva-nos-1", "NOS-REACT-001", "PC-REACT-002", "easy", "mcq", 5],
  ["viva-nos-2", "NOS-REACT-002", "PC-REACT-003", "easy", "mcq", 5],
  ["viva-nos-2", "NOS-REACT-002", "PC-REACT-004", "easy", "mcq", 5],
].map(([nos_key, nos_code, pc_code, difficulty_lvl, question_type, correct_mark]) => ({
  nos_key,
  topic_id: 1,
  nos_code,
  pc_code,
  question_count: 1,
  difficulty_lvl,
  question_type,
  correct_mark,
  negative_mark: 0,
}));

function isEmpty(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSectionType(value: unknown): BatchSectionType | null {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === "theory" || normalized === "practical" || normalized === "viva") {
    return normalized;
  }
  return null;
}

function parseDifficulty(value: unknown): BatchDifficultyLevel | null {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return null;
}

function parseQuestionType(value: unknown): BatchQuestionType | null {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === "mcq" || normalized === "rubric") {
    return normalized;
  }
  return null;
}

function buildSheet<T extends Record<string, unknown>>(
  rows: T[],
  headers: readonly string[]
) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
  sheet["!cols"] = headers.map((header) => ({
    wch: Math.max(header.length + 4, 18),
  }));
  return sheet;
}

export function downloadBatchesTemplate() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(TEMPLATE_BATCHES, BATCH_HEADERS),
    BATCHES_SHEET
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(TEMPLATE_SECTIONS, SECTION_HEADERS),
    SECTIONS_SHEET
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(TEMPLATE_NOS, NOS_HEADERS),
    NOS_SHEET
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(TEMPLATE_PCS, PC_HEADERS),
    PCS_SHEET
  );
  XLSX.writeFile(workbook, "batches_template.xlsx", { bookType: "xlsx" });
}

function getSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, unknown>[] {
  const actualName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === sheetName.toLowerCase()
  );

  if (!actualName) {
    return [];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[actualName]
  );
}

export function parseBatchesExcelFile(
  arrayBuffer: ArrayBuffer,
  options: { jobRoleId?: number } = {}
): ParseBatchesResult {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const errors: BatchValidationError[] = [];
  const batchRows = getSheetRows(workbook, BATCHES_SHEET);
  const sectionRows = getSheetRows(workbook, SECTIONS_SHEET);
  const nosRows = getSheetRows(workbook, NOS_SHEET);
  const pcRows = getSheetRows(workbook, PCS_SHEET);

  if (!batchRows.length) {
    return {
      batches: [],
      errors: [
        {
          type: "error",
          message: `The ${BATCHES_SHEET} sheet is required and must include at least one row.`,
        },
      ],
    };
  }

  const pcsByNosKey = new Map<string, BatchPayload["sections"][number]["nos_list"][number]["pc_list"]>();
  pcRows.forEach((row, rowIndex) => {
    const prefix = `${PCS_SHEET} row ${rowIndex + 2}`;
    const nosKey = stringValue(row.nos_key);
    const difficulty = parseDifficulty(row.difficulty_lvl);
    const questionType = parseQuestionType(row.question_type);

    if (!nosKey) {
      errors.push({ type: "error", message: `${prefix}: nos_key is required.` });
      return;
    }
    if (!difficulty || !questionType || isEmpty(row.pc_code)) {
      errors.push({
        type: "error",
        message: `${prefix}: pc_code, difficulty_lvl, and question_type are required.`,
      });
      return;
    }

    const pc = {
      topic_id: numberValue(row.topic_id),
      nos_code: stringValue(row.nos_code),
      pc_code: stringValue(row.pc_code),
      question_count: numberValue(row.question_count),
      difficulty_lvl: difficulty,
      question_type: questionType,
      correct_mark: numberValue(row.correct_mark),
      negative_mark: numberValue(row.negative_mark),
    };

    pcsByNosKey.set(nosKey, [...(pcsByNosKey.get(nosKey) || []), pc]);
  });

  const nosBySectionKey = new Map<string, BatchPayload["sections"][number]["nos_list"]>();
  nosRows.forEach((row, rowIndex) => {
    const prefix = `${NOS_SHEET} row ${rowIndex + 2}`;
    const sectionKey = stringValue(row.section_key);
    const nosKey = stringValue(row.nos_key);
    const difficulty = parseDifficulty(row.difficulty_lvl);
    const questionType = parseQuestionType(row.question_type);

    if (!sectionKey || !nosKey) {
      errors.push({
        type: "error",
        message: `${prefix}: section_key and nos_key are required.`,
      });
      return;
    }
    if (!difficulty || !questionType || isEmpty(row.nos_code)) {
      errors.push({
        type: "error",
        message: `${prefix}: nos_code, difficulty_lvl, and question_type are required.`,
      });
      return;
    }

    const nos = {
      topic_id: numberValue(row.topic_id),
      nos_code: stringValue(row.nos_code),
      question_count: numberValue(row.question_count),
      difficulty_lvl: difficulty,
      question_type: questionType,
      correct_mark: numberValue(row.correct_mark),
      negative_mark: numberValue(row.negative_mark),
      pc_list: pcsByNosKey.get(nosKey) || [],
    };

    if (!nos.pc_list.length) {
      errors.push({
        type: "warning",
        message: `${prefix}: no PC rows found for nos_key "${nosKey}".`,
      });
    }

    nosBySectionKey.set(sectionKey, [
      ...(nosBySectionKey.get(sectionKey) || []),
      nos,
    ]);
  });

  const sectionsByBatchKey = new Map<string, BatchPayload["sections"]>();
  sectionRows.forEach((row, rowIndex) => {
    const prefix = `${SECTIONS_SHEET} row ${rowIndex + 2}`;
    const batchKey = stringValue(row.batch_key);
    const sectionKey = stringValue(row.section_key);
    const type = parseSectionType(row.type);

    if (!batchKey || !sectionKey || !type || isEmpty(row.name)) {
      errors.push({
        type: "error",
        message: `${prefix}: batch_key, section_key, name, and type are required.`,
      });
      return;
    }

    const section = {
      name: stringValue(row.name),
      type,
      nos_list: nosBySectionKey.get(sectionKey) || [],
    };

    if (!section.nos_list.length) {
      errors.push({
        type: "warning",
        message: `${prefix}: no NOS rows found for section_key "${sectionKey}".`,
      });
    }

    sectionsByBatchKey.set(batchKey, [
      ...(sectionsByBatchKey.get(batchKey) || []),
      section,
    ]);
  });

  const batches = batchRows.reduce<BatchPayload[]>((result, row, rowIndex) => {
    const prefix = `${BATCHES_SHEET} row ${rowIndex + 2}`;
    const batchKey = stringValue(row.batch_key);
    const name = stringValue(row.name);

    if (!batchKey || !name || (!options.jobRoleId && isEmpty(row.job_role_id))) {
      errors.push({
        type: "error",
        message: `${prefix}: batch_key and name are required.`,
      });
      return result;
    }

    const sections = sectionsByBatchKey.get(batchKey) || [];
    if (!sections.length) {
      errors.push({
        type: "warning",
        message: `${prefix}: no sections found for batch_key "${batchKey}".`,
      });
    }

    result.push({
      name,
      job_role_id: options.jobRoleId ?? numberValue(row.job_role_id),
      theory_time: numberValue(row.theory_time),
      practical_time: numberValue(row.practical_time),
      viva_time: numberValue(row.viva_time),
      sections,
    });

    return result;
  }, []);

  return { batches, errors };
}
