import * as XLSX from "xlsx";
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

const MCQ_SHEET_NAME = "MCQ";
const RUBRIC_SHEET_NAME = "Rubric";

const MCQ_HEADERS = [
  "text",
  "difficulty_lvl",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
] as const;

const RUBRIC_HEADERS = [
  "text",
  "difficulty_lvl",
  "rubric_label_1",
  "rubric_percentage_1",
  "rubric_label_2",
  "rubric_percentage_2",
  "rubric_label_3",
  "rubric_percentage_3",
  "rubric_label_4",
  "rubric_percentage_4",
  "rubric_label_5",
  "rubric_percentage_5",
] as const;

const MCQ_TEMPLATE_ROWS = [
  {
    text: "What is the capital of India?",
    difficulty_lvl: "easy",
    option_a: "Delhi",
    option_b: "Mumbai",
    option_c: "Chennai",
    option_d: "Pune",
    correct_option: "a",
  },
];

const RUBRIC_TEMPLATE_ROWS = [
  {
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
  },
];

function isEmpty(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "";
}

function buildSheet<T extends Record<string, unknown>>(
  rows: T[],
  headers: readonly string[]
) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
  sheet["!cols"] = headers.map((header) => ({
    wch: Math.max(String(header).length + 4, 18),
  }));
  return sheet;
}

export function downloadQuestionsTemplate() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(MCQ_TEMPLATE_ROWS, MCQ_HEADERS),
    MCQ_SHEET_NAME
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(RUBRIC_TEMPLATE_ROWS, RUBRIC_HEADERS),
    RUBRIC_SHEET_NAME
  );
  XLSX.writeFile(workbook, "questions_template.xlsx", {
    bookType: "xlsx",
  });
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
    const text = row[`option_${letter}`];            // option_a, option_b, ...
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

function parseMcqRows(
  rows: Record<string, unknown>[],
  errors: ValidationError[],
  topicId: number
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `${MCQ_SHEET_NAME} row ${rowIndex + 2}`;
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);

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
      topic_id: topicId,
      metadata: { options },
    });
  });

  return questions;
}

function parseRubricRows(
  rows: Record<string, unknown>[],
  errors: ValidationError[],
  topicId: number
): CreateQuestionInput[] {
  const questions: CreateQuestionInput[] = [];

  rows.forEach((row, rowIndex) => {
    const prefix = `${RUBRIC_SHEET_NAME} row ${rowIndex + 2}`;
    const text = String(row.text ?? "").trim();
    const difficulty = parseDifficulty(row.difficulty_lvl);

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
      topic_id: topicId,
      metadata: { scores },
    });
  });

  return questions;
}

export function parseQuestionsExcelFile(
  arrayBuffer: ArrayBuffer,
  topicId: number
): ParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const errors: ValidationError[] = [];
  const mcqRows = getSheetRows(workbook, MCQ_SHEET_NAME);
  const rubricRows = getSheetRows(workbook, RUBRIC_SHEET_NAME);

  if (!mcqRows.length && !rubricRows.length) {
    return {
      questions: [],
      errors: [
        {
          type: "error",
          message: 'The workbook must include data in "MCQ" or "Rubric" sheets.',
        },
      ],
    };
  }

  const questions = [
    ...parseMcqRows(mcqRows, errors, topicId),
    ...parseRubricRows(rubricRows, errors, topicId),
  ];

  return { questions, errors };
}
