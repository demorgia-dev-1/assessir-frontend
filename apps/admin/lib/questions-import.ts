import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type {
  CreateQuestionInput,
  DifficultyLevel,
  McqOption,
  QuestionType,
  RubricScore,
} from "@/store/slices/questions-slice";

export interface ValidationError {
  type: "error" | "warning";
  message: string;
  details?: string;
}

export interface ParseResult {
  questions: CreateQuestionInput[];
  errors: ValidationError[];
}

// A NOS from the selected job role's nos_list. Each NOS becomes one sheet in
// the template (named by its code). Each row picks its question type from a
// dropdown; the code maps the sheet back to its nos_id on import.
export type NosSheetInfo = {
  id: string | number;
  code: string;
  name?: string;
};

type ColumnDef = { header: string; key: string; width: number };

// Every NOS sheet carries a `type` dropdown plus both MCQ and rubric columns.
const COLUMNS: ColumnDef[] = [
  { header: "type", key: "type", width: 12 },
  { header: "text", key: "text", width: 40 },
  { header: "difficulty_lvl", key: "difficulty_lvl", width: 16 },
  { header: "option_a", key: "option_a", width: 16 },
  { header: "option_b", key: "option_b", width: 16 },
  { header: "option_c", key: "option_c", width: 16 },
  { header: "option_d", key: "option_d", width: 16 },
  { header: "correct_option", key: "correct_option", width: 16 },
  { header: "rubric_label_1", key: "rubric_label_1", width: 16 },
  { header: "rubric_percentage_1", key: "rubric_percentage_1", width: 18 },
  { header: "rubric_label_2", key: "rubric_label_2", width: 16 },
  { header: "rubric_percentage_2", key: "rubric_percentage_2", width: 18 },
  { header: "rubric_label_3", key: "rubric_label_3", width: 16 },
  { header: "rubric_percentage_3", key: "rubric_percentage_3", width: 18 },
  { header: "rubric_label_4", key: "rubric_label_4", width: 16 },
  { header: "rubric_percentage_4", key: "rubric_percentage_4", width: 18 },
  { header: "rubric_label_5", key: "rubric_label_5", width: 16 },
  { header: "rubric_percentage_5", key: "rubric_percentage_5", width: 18 },
];

const MCQ_EXAMPLE_ROW = {
  type: "mcq",
  text: "What is the capital of India?",
  difficulty_lvl: "easy",
  option_a: "Delhi",
  option_b: "Mumbai",
  option_c: "Chennai",
  option_d: "Pune",
  correct_option: "a",
};

const RUBRIC_EXAMPLE_ROW = {
  type: "rubric",
  text: "Rate candidate communication skills",
  difficulty_lvl: "medium",
  rubric_label_1: "excellent",
  rubric_percentage_1: 100,
  rubric_label_2: "very_good",
  rubric_percentage_2: 80,
  rubric_label_3: "good",
  rubric_percentage_3: 60,
  rubric_label_4: "poor",
  rubric_percentage_4: 30,
  rubric_label_5: "very_poor",
  rubric_percentage_5: 0,
};

// How many rows below the header get dropdowns wired up.
const DROPDOWN_ROWS = 500;

function isEmpty(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

// Excel sheet names are limited to 31 chars and cannot contain \ / ? * [ ] :
function sanitizeSheetName(code: string) {
  return code.replace(/[\\/?*[\]:]/g, "-").trim().slice(0, 31) || "NOS";
}

function normalizeCode(value: string) {
  return sanitizeSheetName(value).toLowerCase();
}

function columnLetter(index1Based: number) {
  // Only need single letters here (well under 26 columns).
  return String.fromCharCode(64 + index1Based);
}

function addListValidation(
  worksheet: ExcelJS.Worksheet,
  headerKey: string,
  values: string[]
) {
  const colIndex = COLUMNS.findIndex((column) => column.key === headerKey) + 1;
  if (colIndex <= 0) {
    return;
  }
  const letter = columnLetter(colIndex);
  for (let row = 2; row <= DROPDOWN_ROWS + 1; row += 1) {
    worksheet.getCell(`${letter}${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${values.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: `Please pick one of: ${values.join(", ")}`,
    };
  }
}

export async function downloadQuestionsTemplate(nosList: NosSheetInfo[]) {
  const workbook = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  nosList.forEach((nos, index) => {
    let name = sanitizeSheetName(nos.code || `NOS ${nos.id ?? index + 1}`);
    let suffix = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${sanitizeSheetName(nos.code).slice(0, 27)} (${suffix})`;
      suffix += 1;
    }
    usedNames.add(name.toLowerCase());

    const worksheet = workbook.addWorksheet(name);
    worksheet.columns = COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    worksheet.addRow(MCQ_EXAMPLE_ROW);
    worksheet.addRow(RUBRIC_EXAMPLE_ROW);

    addListValidation(worksheet, "type", ["mcq", "rubric"]);
    addListValidation(worksheet, "difficulty_lvl", ["easy", "medium", "hard"]);
    addListValidation(worksheet, "correct_option", ["a", "b", "c", "d"]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "questions_template.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseQuestionType(value: unknown): QuestionType | null {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "mcq" || normalized === "rubric") {
    return normalized;
  }
  return null;
}

function parseDifficulty(value: unknown): DifficultyLevel | null {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return null;
}

function parseMcqOptions(row: Record<string, unknown>): McqOption[] {
  const options: McqOption[] = [];
  const correctOption = String(row.correct_option ?? "").trim().toLowerCase();

  for (let index = 1; index <= 4; index += 1) {
    const letter = String.fromCharCode(96 + index); // 1→'a', 2→'b', 3→'c', 4→'d'
    const text = row[`option_${letter}`]; // option_a, option_b, ...
    if (isEmpty(text)) {
      continue;
    }

    options.push({
      text: String(text).trim(),
      is_correct: correctOption === letter,
    });
  }

  return options;
}

function parseRubricScores(row: Record<string, unknown>): RubricScore[] {
  const scores: RubricScore[] = [];

  for (let index = 1; index <= 5; index += 1) {
    const label = row[`rubric_label_${index}`];
    const percentage = row[`rubric_percentage_${index}`];

    if (isEmpty(label) && isEmpty(percentage)) {
      continue;
    }

    scores.push({
      label: String(label ?? "").trim(),
      percentage: Number(percentage),
    });
  }

  return scores;
}

function getSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName]
  );
}

function parseNosSheet(
  rows: Record<string, unknown>[],
  errors: ValidationError[],
  sheetName: string,
  nosId: number
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `Sheet "${sheetName}" row ${rowIndex + 2}`;
    const type = parseQuestionType(row.type);
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);

    // Skip fully-empty rows silently.
    if (!type && !text && isEmpty(row.difficulty_lvl)) {
      return;
    }

    if (!type) {
      errors.push({
        type: "error",
        message: `${prefix}: type must be mcq or rubric.`,
      });
      return;
    }

    if (!text) {
      errors.push({ type: "error", message: `${prefix}: text is required.` });
      return;
    }

    if (!difficulty) {
      errors.push({
        type: "error",
        message: `${prefix}: difficulty_lvl must be easy, medium, or hard.`,
      });
      return;
    }

    if (type === "mcq") {
      const options = parseMcqOptions(row);
      const correctOption = String(row.correct_option ?? "")
        .trim()
        .toLowerCase();
      const correctCount = options.filter((option) => option.is_correct).length;

      if (options.length < 2) {
        errors.push({
          type: "error",
          message: `${prefix}: mcq questions need at least 2 options.`,
        });
        return;
      }

      if (!["a", "b", "c", "d"].includes(correctOption) || correctCount !== 1) {
        errors.push({
          type: "error",
          message: `${prefix}: correct_option must identify a filled option using a, b, c, or d.`,
        });
        return;
      }

      questions.push({
        text,
        type: "mcq",
        difficulty_lvl: difficulty,
        nos_id: nosId,
        metadata: { options },
      });
      return;
    }

    const scores = parseRubricScores(row);
    if (scores.length < 2) {
      errors.push({
        type: "error",
        message: `${prefix}: rubric questions need at least 2 score rows.`,
      });
      return;
    }

    const invalidScore = scores.find(
      (score) =>
        !score.label ||
        !Number.isFinite(score.percentage) ||
        score.percentage < 0 ||
        score.percentage > 100
    );

    if (invalidScore) {
      errors.push({
        type: "error",
        message: `${prefix}: rubric scores need a label and percentage from 0 to 100.`,
      });
      return;
    }

    questions.push({
      text,
      type: "rubric",
      difficulty_lvl: difficulty,
      nos_id: nosId,
      metadata: { scores },
    });
  });

  return questions;
}

export function parseQuestionsExcelFile(
  arrayBuffer: ArrayBuffer,
  nosList: NosSheetInfo[]
): ParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const errors: ValidationError[] = [];

  // Map each NOS code (normalized) to its id so a sheet name resolves to nos_id.
  const nosByCode = new Map<string, NosSheetInfo>();
  nosList.forEach((nos) => {
    if (nos.code) {
      nosByCode.set(normalizeCode(nos.code), nos);
    }
  });

  const questions: CreateQuestionInput[] = [];
  let matchedSheets = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const nos = nosByCode.get(normalizeCode(sheetName));
    if (!nos) {
      errors.push({
        type: "warning",
        message: `Sheet "${sheetName}" does not match any NOS code for the selected job role and was skipped.`,
      });
      return;
    }

    matchedSheets += 1;
    const rows = getSheetRows(workbook, sheetName);
    questions.push(...parseNosSheet(rows, errors, sheetName, Number(nos.id)));
  });

  if (!matchedSheets) {
    errors.push({
      type: "error",
      message:
        "No sheet matched a NOS code for the selected job role. Download the template to get correctly named sheets.",
    });
  }

  return { questions, errors };
}
