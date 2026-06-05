import * as XLSX from "xlsx";
import type {
  BatchDifficultyLevel,
  BatchPayload,
  BatchQuestionType,
  BatchSectionType,
} from "@/store/slices/batches-slice";
import { JobRole } from "@/store/slices/jobroles-slice";

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
  "BATCH NAME",
  "TOTAL THEORY MARKS",
  "TOTAL PRACTICAL MARKS",
  "TOTAL VIVA MARKS",
  "THEORY TIME",
  "PRACTICAL TIME",
  "VIVA TIME",
] as const;

const SECTION_HEADERS = [
  "BATCH NAME",
  "SECTION NAME",
  "TYPE",
] as const;

const NOS_HEADERS = [
  "SECTION NAME",
  "NOS NAME",
  "NOS CODE",
  "NOS MAX THEORY MARKS",
  "NOS MAX PRACTICAL MARKS",
  "NOS MAX VIVA MARKS",
  "TOPIC ID",
  "QUESTION COUNT",
  "DIFFICULTY",
  "QUESTION TYPE",
  "CORRECT MARK",
  "NEGATIVE MARK",
] as const;

// const PC_HEADERS = [
//   "NOS CODE",
//   "PC NAME",
//   "PC CODE",
//   "TOPIC ID",
//   "QUESTION COUNT",
//   "DIFFICULTY",
//   "QUESTION TYPE",
//   "CORRECT MARK",
//   "NEGATIVE MARK",
// ] as const;

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

export function downloadBatchesTemplate(jobRole: JobRole) {
  const batchName = `${jobRole.name || "Job Role"} Batch 1`;

  const batches = [
    {
      "BATCH NAME": batchName,
      "TOTAL THEORY MARKS": numberValue(jobRole.total_theory_marks),
      "TOTAL PRACTICAL MARKS": numberValue(jobRole.total_practical_marks),
      "TOTAL VIVA MARKS": numberValue(jobRole.total_viva_marks),
      "THEORY TIME": 30,
      "PRACTICAL TIME": 30,
      "VIVA TIME": 30,
    },
  ];

  const sections = [
    {
      "BATCH NAME": batchName,
      "SECTION NAME": "Section 1",
      "TYPE": "theory",
    },
    
  ];

  const nosList: any[] = [];
  // const pcList: any[] = [];

  const jobRoleNosList = jobRole.nos_list || [];

  for (const nos of jobRoleNosList) {
    const nosCode = nos.code || nos.nos_code || "";

    for (const section of sections) {
      nosList.push({
        "SECTION NAME": section["SECTION NAME"],
        "NOS NAME": nos.name || "",
        "NOS CODE": nosCode,
        "NOS MAX THEORY MARKS": numberValue(nos.total_theory_marks),
        "NOS MAX PRACTICAL MARKS": numberValue(nos.total_practical_marks),
        "NOS MAX VIVA MARKS": numberValue(nos.total_viva_marks),
        "TOPIC ID": "",
        "QUESTION COUNT": 1,
        "DIFFICULTY": "easy",
        "QUESTION TYPE": section["TYPE"] === "practical" ? "rubric" : "mcq",
        "CORRECT MARK": 0,
        "NEGATIVE MARK": 0,
      });
    }

    // const jobRolePcList = nos.pc_list || [];
    // for (const pc of jobRolePcList) {
    //   const pcCode = pc.code || pc.pc_code || "";
    //   pcList.push({
    //     "NOS CODE": nosCode,
    //     "PC NAME": pc.name || "",
    //     "PC CODE": pcCode,
    //     "TOPIC ID": "",
    //     "QUESTION COUNT": 1,
    //     "DIFFICULTY": "easy",
    //     "QUESTION TYPE": "mcq",
    //     "CORRECT MARK": 0,
    //     "NEGATIVE MARK": 0,
    //   });
    // }
  }

  if (nosList.length === 0) {
    nosList.push({
      "SECTION NAME": "Section 1",
      "NOS NAME": "",
      "NOS CODE": "NOS-001",
      "NOS MAX THEORY MARKS": 0,
      "NOS MAX PRACTICAL MARKS": 0,
      "NOS MAX VIVA MARKS": 0,
      "TOPIC ID": "",
      "QUESTION COUNT": 1,
      "DIFFICULTY": "easy",
      "QUESTION TYPE": "mcq",
      "CORRECT MARK": 0,
      "NEGATIVE MARK": 0,
    });
  }

  // if (pcList.length === 0) {
  //   pcList.push({
  //     "NOS CODE": "NOS-001",
  //     "PC NAME": "",
  //     "PC CODE": "PC-001",
  //     "TOPIC ID": "",
  //     "QUESTION COUNT": 1,
  //     "DIFFICULTY": "easy",
  //     "QUESTION TYPE": "mcq",
  //     "CORRECT MARK": 0,
  //     "NEGATIVE MARK": 0,
  //   });
  // }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(batches, BATCH_HEADERS),
    BATCHES_SHEET
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(sections, SECTION_HEADERS),
    SECTIONS_SHEET
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(nosList, NOS_HEADERS),
    NOS_SHEET
  );
  // XLSX.utils.book_append_sheet(
  //   workbook,
  //   buildSheet(pcList, PC_HEADERS),
  //   PCS_SHEET
  // );
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
  // const pcRows = getSheetRows(workbook, PCS_SHEET);

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

  // const pcsByNosCode = new Map<string, BatchPayload["sections"][number]["nos_list"][number]["pc_list"]>();
  // pcRows.forEach((row, rowIndex) => {
  //   const prefix = `${PCS_SHEET} row ${rowIndex + 2}`;
  //   const nosCode = stringValue(row["NOS CODE"]);
  //   const pcCode = stringValue(row["PC CODE"]);
  //   const difficulty = parseDifficulty(row["DIFFICULTY"]);
  //   const questionType = parseQuestionType(row["QUESTION TYPE"]);
  //
  //   if (!nosCode) {
  //     errors.push({ type: "error", message: `${prefix}: NOS CODE is required.` });
  //     return;
  //   }
  //   if (!difficulty || !questionType || isEmpty(pcCode)) {
  //     errors.push({
  //       type: "error",
  //       message: `${prefix}: PC CODE, DIFFICULTY, and QUESTION TYPE are required.`,
  //     });
  //     return;
  //   }
  //
  //   const pc = {
  //     topic_id: numberValue(row["TOPIC ID"]),
  //     nos_code: nosCode,
  //     pc_code: pcCode,
  //     question_count: numberValue(row["QUESTION COUNT"]),
  //     difficulty_lvl: difficulty,
  //     question_type: questionType,
  //     correct_mark: numberValue(row["CORRECT MARK"]),
  //     negative_mark: numberValue(row["NEGATIVE MARK"]),
  //   };
  //
  //   pcsByNosCode.set(nosCode, [...(pcsByNosCode.get(nosCode) || []), pc]);
  // });

  const nosBySectionName = new Map<string, BatchPayload["sections"][number]["nos_list"]>();
  nosRows.forEach((row, rowIndex) => {
    const prefix = `${NOS_SHEET} row ${rowIndex + 2}`;
    const sectionName = stringValue(row["SECTION NAME"]);
    const nosCode = stringValue(row["NOS CODE"]);
    const difficulty = parseDifficulty(row["DIFFICULTY"]);
    const questionType = parseQuestionType(row["QUESTION TYPE"]);

    if (!sectionName || !nosCode) {
      errors.push({
        type: "error",
        message: `${prefix}: SECTION NAME and NOS CODE are required.`,
      });
      return;
    }
    if (!difficulty || !questionType) {
      errors.push({
        type: "error",
        message: `${prefix}: DIFFICULTY, and QUESTION TYPE are required.`,
      });
      return;
    }

    const nos = {
      topic_id: numberValue(row["TOPIC ID"]),
      nos_code: nosCode,
      question_count: numberValue(row["QUESTION COUNT"]),
      difficulty_lvl: difficulty,
      question_type: questionType,
      correct_mark: numberValue(row["CORRECT MARK"]),
      negative_mark: numberValue(row["NEGATIVE MARK"]),
      pc_list: [], // PC sheet disabled for now
    };

    // if (!nos.pc_list.length) {
    //   errors.push({
    //     type: "warning",
    //     message: `${prefix}: no PC rows found for NOS CODE "${nosCode}".`,
    //   });
    // }

    nosBySectionName.set(sectionName, [
      ...(nosBySectionName.get(sectionName) || []),
      nos,
    ]);
  });

  const sectionsByBatchName = new Map<string, BatchPayload["sections"]>();
  sectionRows.forEach((row, rowIndex) => {
    const prefix = `${SECTIONS_SHEET} row ${rowIndex + 2}`;
    const batchName = stringValue(row["BATCH NAME"]);
    const sectionName = stringValue(row["SECTION NAME"]);
    const type = parseSectionType(row["TYPE"]);

    if (!batchName || !sectionName || !type) {
      errors.push({
        type: "error",
        message: `${prefix}: BATCH NAME, SECTION NAME, and TYPE are required.`,
      });
      return;
    }

    const section = {
      name: sectionName,
      type,
      nos_list: nosBySectionName.get(sectionName) || [],
    };

    if (!section.nos_list.length) {
      errors.push({
        type: "warning",
        message: `${prefix}: no NOS rows found for SECTION NAME "${sectionName}".`,
      });
    }

    sectionsByBatchName.set(batchName, [
      ...(sectionsByBatchName.get(batchName) || []),
      section,
    ]);
  });

  const batches = batchRows.reduce<BatchPayload[]>((result, row, rowIndex) => {
    const prefix = `${BATCHES_SHEET} row ${rowIndex + 2}`;
    const name = stringValue(row["BATCH NAME"]);

    if (!name) {
      errors.push({
        type: "error",
        message: `${prefix}: BATCH NAME is required.`,
      });
      return result;
    }

    const sections = sectionsByBatchName.get(name) || [];
    if (!sections.length) {
      errors.push({
        type: "warning",
        message: `${prefix}: no sections found for BATCH NAME "${name}".`,
      });
    }

    result.push({
      name,
      job_role_id: options.jobRoleId ?? 0,
      theory_time: numberValue(row["THEORY TIME"]),
      practical_time: numberValue(row["PRACTICAL TIME"]),
      viva_time: numberValue(row["VIVA TIME"]),
      sections,
    });

    return result;
  }, []);

  return { batches, errors };
}
