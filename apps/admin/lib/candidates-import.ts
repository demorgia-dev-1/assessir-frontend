import * as XLSX from "xlsx";

export interface CandidateValidationError {
  type: "error" | "warning";
  message: string;
  details?: string;
}

export interface ParseCandidatesResult {
  candidates: { enrollment_no: string; password: string }[];
  errors: CandidateValidationError[];
}

const CANDIDATES_SHEET = "Candidates";
const CANDIDATE_HEADERS = [
  "ENROLLMENT NO",
  "PASSWORD",
] as const;

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function buildSheet<T extends Record<string, unknown>>(
  rows: T[],
  headers: readonly string[]
) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
  sheet["!cols"] = headers.map((header) => ({
    wch: Math.max(header.length + 4, 22),
  }));
  return sheet;
}

export function downloadCandidatesTemplate(batchName: string) {
  const rows = [
    {
      "ENROLLMENT NO": "ENR001",
      "PASSWORD": "Password1",
    },
    {
      "ENROLLMENT NO": "ENR002",
      "PASSWORD": "Password2",
    },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(rows, CANDIDATE_HEADERS),
    CANDIDATES_SHEET
  );
  const safeBatchName = batchName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  XLSX.writeFile(workbook, `${safeBatchName}_candidates_template.xlsx`, { bookType: "xlsx" });
}

function getSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, unknown>[] {
  const actualName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === sheetName.toLowerCase()
  );

  if (!actualName) return [];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[actualName]
  );
}

export function parseCandidatesExcelFile(arrayBuffer: ArrayBuffer): ParseCandidatesResult {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const rows = getSheetRows(workbook, CANDIDATES_SHEET);
  const errors: CandidateValidationError[] = [];

  if (!rows.length) {
    return {
      candidates: [],
      errors: [
        {
          type: "error",
          message: "Missing or empty Candidates sheet.",
          details: "Add a sheet named Candidates with the columns ENROLLMENT NO and PASSWORD.",
        },
      ],
    };
  }

  const candidates: { enrollment_no: string; password: string }[] = [];
  const seenEnrollments = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const enrollmentNo = stringValue(row["ENROLLMENT NO"]);
    const password = stringValue(row["PASSWORD"]);

    if (!enrollmentNo && !password) {
      return;
    }

    if (!enrollmentNo) {
      errors.push({
        type: "error",
        message: `Row ${rowNumber}: enrollment number is required.`,
      });
      return;
    }

    if (!password) {
      errors.push({
        type: "error",
        message: `Row ${rowNumber}: password is required.`,
      });
      return;
    }

    const normEnrollment = enrollmentNo.toLowerCase();
    if (seenEnrollments.has(normEnrollment)) {
      errors.push({
        type: "warning",
        message: `Row ${rowNumber}: duplicate enrollment number "${enrollmentNo}" skipped.`,
      });
      return;
    }

    seenEnrollments.add(normEnrollment);
    candidates.push({
      enrollment_no: enrollmentNo,
      password,
    });
  });

  if (!candidates.length && !errors.length) {
    errors.push({
      type: "error",
      message: "No valid candidates found in the Excel file.",
    });
  }

  return { candidates, errors };
}
