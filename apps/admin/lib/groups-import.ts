import * as XLSX from "xlsx";
import type { GroupPayload } from "@/store/slices/groups-slice";

export interface GroupValidationError {
  type: "error" | "warning";
  message: string;
  details?: string;
}

export interface ParseGroupsResult {
  groups: GroupPayload[];
  errors: GroupValidationError[];
}

const GROUPS_SHEET = "Groups";
const GROUP_HEADERS = [
  "GROUP NAME",
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

export function downloadGroupsTemplate() {
  const rows = [
    {
      "GROUP NAME": "Group A",
      "ENROLLMENT NO": "ENR001",
      "PASSWORD": "Password1",
    },
    {
      "GROUP NAME": "Group A",
      "ENROLLMENT NO": "ENR002",
      "PASSWORD": "Password2",
    },
    {
      "GROUP NAME": "Group B",
      "ENROLLMENT NO": "ENR003",
      "PASSWORD": "Password3",
    },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(rows, GROUP_HEADERS),
    GROUPS_SHEET
  );
  XLSX.writeFile(workbook, "groups_template.xlsx", { bookType: "xlsx" });
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

export function parseGroupsExcelFile(arrayBuffer: ArrayBuffer): ParseGroupsResult {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const rows = getSheetRows(workbook, GROUPS_SHEET);
  const errors: GroupValidationError[] = [];

  if (!rows.length) {
    return {
      groups: [],
      errors: [
        {
          type: "error",
          message: "Missing or empty Groups sheet.",
          details: "Add a sheet named Groups with the provided template columns.",
        },
      ],
    };
  }

  const groupsMap = new Map<string, GroupPayload>();
  const candidateKeyMap = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const groupName = stringValue(row["GROUP NAME"]);
    const enrollmentNo = stringValue(row["ENROLLMENT NO"]);
    const password = stringValue(row["PASSWORD"]);

    if (!groupName && !enrollmentNo && !password) {
      return;
    }

    if (!groupName) {
      errors.push({
        type: "error",
        message: `Row ${rowNumber}: group name is required.`,
      });
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

    const candidateKey = `${groupName.toLowerCase()}::${enrollmentNo.toLowerCase()}`;
    if (candidateKeyMap.has(candidateKey)) {
      errors.push({
        type: "warning",
        message: `Row ${rowNumber}: duplicate candidate skipped.`,
        details: `${groupName} / ${enrollmentNo}`,
      });
      return;
    }

    candidateKeyMap.set(candidateKey, rowNumber);

    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, {
        name: groupName,
        candidates: [],
      });
    }

    groupsMap.get(groupName)!.candidates.push({
      enrollment_no: enrollmentNo,
      password,
    });
  });

  const groups = Array.from(groupsMap.values()).filter(
    (group) => group.candidates.length > 0
  );

  if (!groups.length) {
    errors.push({
      type: "error",
      message: "No valid groups found in the Excel file.",
    });
  }

  return { groups, errors };
}
