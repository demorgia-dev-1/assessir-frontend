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

// A NOS from the selected job role's nos_list. The current template keeps all
// NOS in two tabs: one for MCQ rows and one for rubric rows.
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
// Every sheet starts with its header row, then a sample row, then one row per NOS.
const HEADER_ROW = 1;
const FIRST_DATA_ROW = HEADER_ROW + 1;

const MCQ_COLUMNS: ColumnDef[] = [
  { header: "Nos Code", key: "nos_code", width: 18 },
  { header: "text", key: "text", width: 40 },
  { header: "difficulty_lvl", key: "difficulty_lvl", width: 16 },
  { header: "option_a", key: "option_a", width: 18 },
  { header: "option_b", key: "option_b", width: 18 },
  { header: "option_c", key: "option_c", width: 18 },
  { header: "option_d", key: "option_d", width: 18 },
  { header: "correct_option", key: "correct_option", width: 16 },
];

const RUBRIC_COLUMNS: ColumnDef[] = [
  { header: "Nos Code", key: "nos_code", width: 18 },
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

function sameTabSheetName(code: string, label: string) {
  const base = sanitizeCodeBase(code).trim();
  if (!base) {
    return `${label}(All Questions)`;
  }
  const wrapperLength = label.length + 2;
  return `${label}(${base.slice(0, MAX_SHEET_NAME - wrapperLength).trim()})`;
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
  values: string[],
  startRow = 2
) {
  const colIndex = columns.findIndex((column) => column.key === headerKey) + 1;
  if (colIndex <= 0) {
    return;
  }
  const letter = columnLetter(colIndex);
  for (let row = startRow; row < startRow + DROPDOWN_ROWS; row += 1) {
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
  columns: ColumnDef[]
) {
  const worksheet = workbook.addWorksheet(name);
  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).key = column.key;
    worksheet.getColumn(index + 1).width = column.width;
  });

  worksheet.addRow(columns.map((column) => column.header));
  worksheet.getRow(HEADER_ROW).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: HEADER_ROW }];
  return worksheet;
}

// The sample sits in the data area (first row under the header) so it shows the
// exact shape an import row needs, NOS code included. It is styled like every
// other data row.
function addSampleRow(
  worksheet: ExcelJS.Worksheet,
  exampleRow: Record<string, unknown>,
  nosCode: string
) {
  worksheet.addRow({ ...exampleRow, nos_code: nosCode });
}

export async function downloadQuestionsTemplate(
  nosList: NosSheetInfo[],
  jobRoleName?: string
) {
  const workbook = new ExcelJS.Workbook();
  const templateName = jobRoleName || "All Questions";

  const nosCodes = nosList.map(
    (nos, index) => nos.code || `NOS-${nos.id ?? index + 1}`
  );
  const sampleNosCode = nosCodes[0] ?? "";

  const mcqSheet = buildWorksheet(
    workbook,
    sameTabSheetName(templateName, MCQ_LABEL),
    MCQ_COLUMNS
  );
  const rubricSheet = buildWorksheet(
    workbook,
    sameTabSheetName(templateName, RUBRIC_LABEL),
    RUBRIC_COLUMNS
  );

  addSampleRow(mcqSheet, MCQ_EXAMPLE_ROW, sampleNosCode);
  addSampleRow(rubricSheet, RUBRIC_EXAMPLE_ROW, sampleNosCode);

  // Pre-fill one row per NOS of the selected job role on both tabs. This has to
  // happen before addListValidation, which materialises DROPDOWN_ROWS rows and
  // would otherwise push these rows below them.
  nosCodes.forEach((nosCode) => {
    mcqSheet.addRow({ nos_code: nosCode });
    rubricSheet.addRow({ nos_code: nosCode });
  });

  addListValidation(mcqSheet, MCQ_COLUMNS, "difficulty_lvl", [
    "easy",
    "medium",
    "hard",
  ], FIRST_DATA_ROW);
  addListValidation(mcqSheet, MCQ_COLUMNS, "correct_option", [
    "a",
    "b",
    "c",
    "d",
  ], FIRST_DATA_ROW);
  addListValidation(rubricSheet, RUBRIC_COLUMNS, "difficulty_lvl", [
    "easy",
    "medium",
    "hard",
  ], FIRST_DATA_ROW);

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
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[sheetName],
    {
      header: 1,
      defval: "",
    }
  );
  const headerRowIndex = rawRows.findIndex((row) => {
    const normalizedHeaders = row.map((cell) =>
      String(cell).trim().toLowerCase()
    );
    return (
      normalizedHeaders.includes("text") &&
      normalizedHeaders.includes("difficulty_lvl")
    );
  });

  if (headerRowIndex < 0) {
    return [];
  }

  const headers = rawRows[headerRowIndex].map((header) =>
    String(header).trim()
  );

  return rawRows.slice(headerRowIndex + 1).map((row, rowIndex) => {
    const mappedRow = headers.reduce<Record<string, unknown>>(
      (accumulator, header, columnIndex) => {
        if (header) {
          accumulator[header] = row[columnIndex];
        }
        return accumulator;
      },
      { __rowNumber: headerRowIndex + rowIndex + 2 }
    );

    return {
      ...mappedRow,
      nos_code:
        mappedRow.nos_code ?? mappedRow["Nos Code"] ?? mappedRow["Nos ID"],
    };
  });
}

function parseMcqSheet(
  rows: Record<string, unknown>[],
  errors: ValidationError[],
  sheetName: string,
  nosIdForRow: number | ((row: Record<string, unknown>) => number | null)
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `Sheet "${sheetName}" row ${row.__rowNumber ?? rowIndex + 2}`;
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);

    if (!text && isEmpty(row.difficulty_lvl)) {
      return; // skip empty rows
    }

    const nosId =
      typeof nosIdForRow === "function" ? nosIdForRow(row) : nosIdForRow;
    if (!nosId) {
      errors.push({
        type: "error",
        message: `${prefix}: Nos Code must match a NOS in the selected job role.`,
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
  nosIdForRow: number | ((row: Record<string, unknown>) => number | null)
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `Sheet "${sheetName}" row ${row.__rowNumber ?? rowIndex + 2}`;
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);
    const expectedAnswer = String(row.expected_answer ?? "").trim();

    if (!text && isEmpty(row.difficulty_lvl)) {
      return; // skip empty rows
    }

    const nosId =
      typeof nosIdForRow === "function" ? nosIdForRow(row) : nosIdForRow;
    if (!nosId) {
      errors.push({
        type: "error",
        message: `${prefix}: Nos Code must match a NOS in the selected job role.`,
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

  const nosCodeMap = new Map<string, number>();
  nosList.forEach((nos) => {
    if (nos.code) {
      nosCodeMap.set(String(nos.code).trim().toLowerCase(), Number(nos.id));
    }
  });

  const resolveNosId = (row: Record<string, unknown>) => {
    const nosCode = String(row.nos_code ?? "").trim().toLowerCase();
    if (!nosCode) {
      return null;
    }
    return nosCodeMap.get(nosCode) ?? null;
  };

  // Map each old canonical sheet name (normalized) to its NOS id + question
  // type. This keeps previously downloaded per-NOS templates importable.
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
    const normalizedSheetName = sheetName.trim().toLowerCase();
    const target = sheetMap.get(normalizedSheetName);
    const isMcqTab = normalizedSheetName.startsWith(`${MCQ_LABEL.toLowerCase()}(`);
    const isRubricTab = normalizedSheetName.startsWith(
      `${RUBRIC_LABEL.toLowerCase()}(`
    );

    if (!target && !isMcqTab && !isRubricTab) {
      errors.push({
        type: "warning",
        message: `Sheet "${sheetName}" is not a "MCQ(...)" or "Rubric(...)" sheet and was skipped.`,
      });
      return;
    }

    matchedSheets += 1;
    const rows = getSheetRows(workbook, sheetName);
    if (target?.type === "mcq") {
      questions.push(...parseMcqSheet(rows, errors, sheetName, target.nosId));
    } else if (target?.type === "rubric") {
      questions.push(...parseRubricSheet(rows, errors, sheetName, target.nosId));
    } else if (isMcqTab) {
      questions.push(...parseMcqSheet(rows, errors, sheetName, resolveNosId));
    } else {
      questions.push(...parseRubricSheet(rows, errors, sheetName, resolveNosId));
    }
  });

  if (!matchedSheets) {
    errors.push({
      type: "error",
      message:
        "No MCQ or Rubric sheet matched. Download the template to get correctly named sheets.",
    });
  }

  return { questions, errors };
}
