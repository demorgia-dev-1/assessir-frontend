import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type {
  CreateQuestionInput,
  DifficultyLevel,
  McqOption,
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

// A NOS from the selected job role's nos_list. Each NOS becomes two sheets in
// the template ("MCQ(<code>)" and "Rubric(<code>)"); the label + code maps a
// sheet back to its nos_id and question type on import.
export type NosSheetInfo = {
  id: string | number;
  code: string;
  name?: string;
};

type ColumnDef = { header: string; key: string; width: number };

const MCQ_LABEL = "MCQ";
const RUBRIC_LABEL = "Rubric";
// Excel caps sheet names at 31 chars.
const MAX_SHEET_NAME = 31;
// How many rows below the header get dropdowns wired up.
const DROPDOWN_ROWS = 500;

const MCQ_COLUMNS: ColumnDef[] = [
  { header: "text", key: "text", width: 40 },
  { header: "difficulty_lvl", key: "difficulty_lvl", width: 16 },
  { header: "option_a", key: "option_a", width: 18 },
  { header: "option_b", key: "option_b", width: 18 },
  { header: "option_c", key: "option_c", width: 18 },
  { header: "option_d", key: "option_d", width: 18 },
  { header: "correct_option", key: "correct_option", width: 16 },
];

const RUBRIC_COLUMNS: ColumnDef[] = [
  { header: "text", key: "text", width: 40 },
  { header: "difficulty_lvl", key: "difficulty_lvl", width: 16 },
  { header: "expected_answer", key: "expected_answer", width: 40 },
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
  text: "What is the capital of India?",
  difficulty_lvl: "easy",
  option_a: "Delhi",
  option_b: "Mumbai",
  option_c: "Chennai",
  option_d: "Pune",
  correct_option: "a",
};

const RUBRIC_EXAMPLE_ROW = {
  text: "Evaluate candidate's React component design skills",
  difficulty_lvl: "medium",
  expected_answer:
    "Well-structured, reusable components with clear props and separation of concerns.",
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

function isEmpty(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

// Strip characters Excel forbids in sheet names: \ / ? * [ ] :
function sanitizeCodeBase(code: string) {
  return code.replace(/[\\/?*[\]:]/g, "-").trim();
}

// Build the sheet name "<label>(<code>)" for a NOS, keeping within Excel's
// 31-char limit by truncating the code portion.
function nosSheetName(code: string, label: string) {
  const wrapperLength = label.length + 2; // "(" + ")"
  const base = sanitizeCodeBase(code)
    .slice(0, MAX_SHEET_NAME - wrapperLength)
    .trim();
  return `${label}(${base})`;
}

function columnLetter(index1Based: number) {
  let index = index1Based;
  let letter = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter;
}

function addListValidation(
  worksheet: ExcelJS.Worksheet,
  columns: ColumnDef[],
  headerKey: string,
  values: string[]
) {
  const colIndex = columns.findIndex((column) => column.key === headerKey) + 1;
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

function buildWorksheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ColumnDef[],
  exampleRow: Record<string, unknown>
) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.addRow(exampleRow);
  return worksheet;
}

export async function downloadQuestionsTemplate(nosList: NosSheetInfo[]) {
  const workbook = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  const uniqueName = (baseName: string) => {
    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${baseName.slice(0, MAX_SHEET_NAME - 4)} (${suffix})`;
      suffix += 1;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };

  nosList.forEach((nos, index) => {
    const code = nos.code || `NOS ${nos.id ?? index + 1}`;

    const mcqSheet = buildWorksheet(
      workbook,
      uniqueName(nosSheetName(code, MCQ_LABEL)),
      MCQ_COLUMNS,
      MCQ_EXAMPLE_ROW
    );
    addListValidation(mcqSheet, MCQ_COLUMNS, "difficulty_lvl", [
      "easy",
      "medium",
      "hard",
    ]);
    addListValidation(mcqSheet, MCQ_COLUMNS, "correct_option", [
      "a",
      "b",
      "c",
      "d",
    ]);

    const rubricSheet = buildWorksheet(
      workbook,
      uniqueName(nosSheetName(code, RUBRIC_LABEL)),
      RUBRIC_COLUMNS,
      RUBRIC_EXAMPLE_ROW
    );
    addListValidation(rubricSheet, RUBRIC_COLUMNS, "difficulty_lvl", [
      "easy",
      "medium",
      "hard",
    ]);
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

function parseMcqSheet(
  rows: Record<string, unknown>[],
  errors: ValidationError[],
  sheetName: string,
  nosId: number
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `Sheet "${sheetName}" row ${rowIndex + 2}`;
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);

    if (!text && isEmpty(row.difficulty_lvl)) {
      return; // skip empty rows
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

    const options = parseMcqOptions(row);
    const correctOption = String(row.correct_option ?? "").trim().toLowerCase();
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
  });

  return questions;
}

function parseRubricSheet(
  rows: Record<string, unknown>[],
  errors: ValidationError[],
  sheetName: string,
  nosId: number
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `Sheet "${sheetName}" row ${rowIndex + 2}`;
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);
    const expectedAnswer = String(row.expected_answer ?? "").trim();

    if (!text && isEmpty(row.difficulty_lvl)) {
      return; // skip empty rows
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
      metadata: {
        scores,
        ...(expectedAnswer ? { expected_answer: expectedAnswer } : {}),
      },
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

  // Map each canonical sheet name (normalized) to its NOS id + question type.
  const sheetMap = new Map<string, { nosId: number; type: "mcq" | "rubric" }>();
  nosList.forEach((nos) => {
    if (!nos.code) {
      return;
    }
    const nosId = Number(nos.id);
    sheetMap.set(nosSheetName(nos.code, MCQ_LABEL).toLowerCase(), {
      nosId,
      type: "mcq",
    });
    sheetMap.set(nosSheetName(nos.code, RUBRIC_LABEL).toLowerCase(), {
      nosId,
      type: "rubric",
    });
  });

  const questions: CreateQuestionInput[] = [];
  let matchedSheets = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const target = sheetMap.get(sheetName.trim().toLowerCase());
    if (!target) {
      errors.push({
        type: "warning",
        message: `Sheet "${sheetName}" is not a "MCQ(<NOS code>)" or "Rubric(<NOS code>)" sheet for the selected job role and was skipped.`,
      });
      return;
    }

    matchedSheets += 1;
    const rows = getSheetRows(workbook, sheetName);
    if (target.type === "mcq") {
      questions.push(...parseMcqSheet(rows, errors, sheetName, target.nosId));
    } else {
      questions.push(...parseRubricSheet(rows, errors, sheetName, target.nosId));
    }
  });

  if (!matchedSheets) {
    errors.push({
      type: "error",
      message:
        "No sheet matched a NOS for the selected job role. Download the template to get correctly named MCQ/Rubric sheets.",
    });
  }

  return { questions, errors };
}
