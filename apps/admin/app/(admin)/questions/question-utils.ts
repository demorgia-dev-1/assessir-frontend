import type { QuestionFormValues } from "@/components/QuestionForm";
import type { Question } from "@/store/slices/questions-slice";

export const DEFAULT_OPTIONS = [
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
];

export const DEFAULT_SCORES = [
  { label: "excellent", percentage: 100 },
  { label: "very_good", percentage: 80 },
  { label: "good", percentage: 60 },
  { label: "poor", percentage: 30 },
  { label: "very_poor", percentage: 0 },
];

export function createEmptyForm(): QuestionFormValues {
  return {
    text: "",
    type: "mcq",
    difficultyLvl: "easy",
    jobRoleID: "",
    nosID: "",
    metadata: {
      options: DEFAULT_OPTIONS.map((option) => ({ ...option })),
      scores: DEFAULT_SCORES.map((score) => ({ ...score })),
      expected_answer: "",
    },
  };
}

export function stripHtml(html: string) {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || container.innerText || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeQuestionForm(question: Question): QuestionFormValues {
  const metadata =
    typeof question.metadata === "string"
      ? { options: DEFAULT_OPTIONS, scores: DEFAULT_SCORES, expected_answer: "" }
      : question.metadata || {};

  const jobRoleId = question.nos?.job_role_id ?? question.nos?.JobRoleID ?? "";

  return {
    text: question.text,
    type: question.type,
    difficultyLvl: question.difficultyLvl,
    jobRoleID: jobRoleId ? String(jobRoleId) : "",
    nosID: question.nosID ? String(question.nosID) : "",
    metadata: {
      options: metadata.options?.length
        ? metadata.options.map((option) => ({ ...option }))
        : DEFAULT_OPTIONS.map((option) => ({ ...option })),
      scores: metadata.scores?.length
        ? metadata.scores.map((score) => ({ ...score }))
        : DEFAULT_SCORES.map((score) => ({ ...score })),
      expected_answer: metadata.expected_answer ?? "",
    },
  };
}

export function buildCreatePayload(values: QuestionFormValues) {
  return {
    text: values.text.trim(),
    type: values.type,
    difficulty_lvl: values.difficultyLvl,
    nos_id: Number(values.nosID),
    metadata:
      values.type === "mcq"
        ? {
            options: values.metadata.options
              .filter((option) => stripHtml(option.text))
              .map((option) => ({
                text: option.text.trim(),
                is_correct: option.is_correct,
              })),
          }
        : {
            expected_answer: values.metadata.expected_answer.trim(),
            scores: values.metadata.scores
              .filter((score) => score.label.trim())
              .map((score) => ({
                label: score.label.trim(),
                percentage: Number(score.percentage),
              })),
          },
  };
}

export function buildUpdatePayload(
  id: string | number,
  values: QuestionFormValues
) {
  const createPayload = buildCreatePayload(values);
  return {
    id,
    text: createPayload.text,
    type: createPayload.type,
    difficultyLvl: values.difficultyLvl,
    nos_id: Number(values.nosID),
    metadata: createPayload.metadata,
  };
}

export function validateForm(values: QuestionFormValues) {
  if (!stripHtml(values.text)) {
    return "Question text is required.";
  }

  if (!values.jobRoleID) {
    return "Please select a job role.";
  }

  if (!values.nosID) {
    return "Please select a NOS.";
  }

  if (values.type === "mcq") {
    const validOptions = values.metadata.options.filter((option) =>
      stripHtml(option.text)
    );
    const correctCount = validOptions.filter(
      (option) => option.is_correct
    ).length;

    if (validOptions.length < 2) {
      return "MCQ questions need at least 2 options.";
    }

    if (correctCount !== 1) {
      return "MCQ questions need exactly 1 correct option.";
    }

    return null;
  }

  const validScores = values.metadata.scores.filter((score) =>
    score.label.trim()
  );
  if (validScores.length < 2) {
    return "Rubric questions need at least 2 score rows.";
  }

  const invalidScore = validScores.find(
    (score) =>
      !Number.isFinite(Number(score.percentage)) ||
      Number(score.percentage) < 0 ||
      Number(score.percentage) > 100
  );

  if (invalidScore) {
    return "Rubric percentages must be between 0 and 100.";
  }

  return null;
}
