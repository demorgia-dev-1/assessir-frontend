import * as XLSX from "xlsx";

export interface ParsedJobRole {
  name: string;
  code: string;
  total_theory_marks: number;
  total_practical_marks: number;
  total_viva_marks: number;
  nos_list: ParsedNos[];
}

export interface ParsedNos {
  name: string;
  code: string;
  total_theory_marks: number;
  total_practical_marks: number;
  total_viva_marks: number;
  pc_list: ParsedPc[];
}

export interface ParsedPc {
  name: string;
  code: string;
  total_theory_marks: number;
  total_practical_marks: number;
  total_viva_marks: number;
}

export interface ValidationError {
  type: "error" | "warning";
  message: string;
  details?: string;
}

const LEGACY_TEMPLATE_HEADERS = [
  "job_role_name",
  "job_role_code",
  "job_role_theory_marks",
  "job_role_practical_marks",
  "job_role_viva_marks",
  "nos_name",
  "nos_code",
  "nos_theory_marks",
  "nos_practical_marks",
  "nos_viva_marks",
  "pc_name",
  "pc_code",
  "pc_theory_marks",
  "pc_practical_marks",
  "pc_viva_marks",
] as const;

const LEGACY_NOS_ONLY_TEMPLATE_HEADERS = [
  "job_role_name",
  "job_role_code",
  "job_role_theory_marks",
  "job_role_practical_marks",
  "job_role_viva_marks",
  "nos_name",
  "nos_code",
  "nos_theory_marks",
  "nos_practical_marks",
  "nos_viva_marks",
] as const;

const JOBROLE_SHEET_HEADERS = [
  "jobrole_name",
  "jobrole_code",
  "theory_marks",
  "practical_marks",
  "viva_marks",
] as const;

const NOS_SHEET_HEADERS = [
  "jobrole_code",
  "nos_name",
  "nos_code",
  "theory_marks",
  "practical_marks",
  "viva_marks",
] as const;

const PC_SHEET_HEADERS = [
  "jobrole_code",
  "nos_code",
  "pc_name",
  "pc_code",
  "theory_marks",
  "practical_marks",
  "viva_marks",
] as const;

const JOBROLE_TEMPLATE_ROWS = [
  {
    jobrole_name: "Backend Developer Node.js",
    jobrole_code: "QP-COMP-NODE-2026",
    theory_marks: 35.5,
    practical_marks: 45,
    viva_marks: 19.5,
  },
  {
    jobrole_name: "Frontend Developer React",
    jobrole_code: "QP-COMP-REACT-2026",
    theory_marks: 30,
    practical_marks: 50,
    viva_marks: 20,
  },
];

const NOS_TEMPLATE_ROWS = [
  {
    jobrole_code: "QP-COMP-NODE-2026",
    nos_name: "Build REST APIs",
    nos_code: "NOS-NODE-001",
    theory_marks: 15.5,
    practical_marks: 20,
    viva_marks: 9.5,
  },
  {
    jobrole_code: "QP-COMP-NODE-2026",
    nos_name: "Database Integration",
    nos_code: "NOS-NODE-002",
    theory_marks: 20,
    practical_marks: 25,
    viva_marks: 10,
  },
  {
    jobrole_code: "QP-COMP-REACT-2026",
    nos_name: "Build UI Components",
    nos_code: "NOS-REACT-001",
    theory_marks: 15,
    practical_marks: 25,
    viva_marks: 10,
  },
  {
    jobrole_code: "QP-COMP-REACT-2026",
    nos_name: "API Integration",
    nos_code: "NOS-REACT-002",
    theory_marks: 15,
    practical_marks: 25,
    viva_marks: 10,
  },
];

const PC_TEMPLATE_ROWS: Record<string, unknown>[] = [];

type SheetTheme = {
  headerFill: string;
  bodyFill: string;
  border: string;
};

const JOBROLE_THEME: SheetTheme = {
  headerFill: "1D4ED8",
  bodyFill: "EFF6FF",
  border: "93C5FD",
};

const NOS_THEME: SheetTheme = {
  headerFill: "0F766E",
  bodyFill: "F0FDFA",
  border: "99F6E4",
};

const PC_THEME: SheetTheme = {
  headerFill: "7C3AED",
  bodyFill: "F5F3FF",
  border: "C4B5FD",
};

export interface ParseResult {
  jobRoles: ParsedJobRole[];
  errors: ValidationError[];
}

function isCellEmpty(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

function parseMarksValue(value: unknown): number | undefined {
  if (isCellEmpty(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function buildSheet<T extends Record<string, unknown>>(
  rows: T[],
  headers: readonly string[],
  theme: SheetTheme
) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
  const maxContentLengthByHeader = headers.map((header) =>
    rows.reduce(
      (max, row) => Math.max(max, String(row[header] ?? "").length),
      header.length
    )
  );

  ws["!cols"] = headers.map((header, index) => ({
    wch: Math.max(maxContentLengthByHeader[index] + 4, header.length + 4, 18),
  }));
  ws["!rows"] = [{ hpt: 24 }, ...rows.map(() => ({ hpt: 21 }))];
  ws["!autofilter"] = {
    ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1`,
  };

  headers.forEach((_, columnIndex) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
    const cell = ws[cellRef];
    if (!cell) {
      return;
    }

    cell.s = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 12,
      },
      fill: {
        patternType: "solid",
        fgColor: { rgb: theme.headerFill },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
      border: {
        top: { style: "thin", color: { rgb: theme.border } },
        bottom: { style: "thin", color: { rgb: theme.border } },
        left: { style: "thin", color: { rgb: theme.border } },
        right: { style: "thin", color: { rgb: theme.border } },
      },
    };
  });

  rows.forEach((_, rowIndex) => {
    headers.forEach((__, columnIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      const cell = ws[cellRef];
      if (!cell) {
        return;
      }

      cell.s = {
        fill: {
          patternType: "solid",
          fgColor: { rgb: rowIndex % 2 === 0 ? theme.bodyFill : "FFFFFF" },
        },
        alignment: {
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: theme.border } },
          bottom: { style: "thin", color: { rgb: theme.border } },
          left: { style: "thin", color: { rgb: theme.border } },
          right: { style: "thin", color: { rgb: theme.border } },
        },
      };
    });
  });

  return ws;
}

function downloadWorkbook() {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(JOBROLE_TEMPLATE_ROWS, JOBROLE_SHEET_HEADERS, JOBROLE_THEME),
    "Jobrole"
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(NOS_TEMPLATE_ROWS, NOS_SHEET_HEADERS, NOS_THEME),
    "Nos"
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(PC_TEMPLATE_ROWS, PC_SHEET_HEADERS, PC_THEME),
    "Pc"
  );

  XLSX.writeFile(wb, "job_roles_template.xlsx", {
    bookType: "xlsx",
    cellStyles: true,
  });
}

export function downloadTemplate() {
  downloadWorkbook();
}

function getWorkbookSheet(
  workbook: XLSX.WorkBook,
  expectedName: string
): XLSX.WorkSheet | undefined {
  const actualName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === expectedName.toLowerCase()
  );
  return actualName ? workbook.Sheets[actualName] : undefined;
}

function hasHeaders(
  row: Record<string, unknown> | undefined,
  headers: readonly string[]
): boolean {
  if (!row) {
    return false;
  }

  const keys = Object.keys(row);
  return headers.every((header) => keys.includes(header));
}

function validateMarksSum(
  actual: number,
  expected: number,
  message: string,
  errors: ValidationError[]
) {
  const tolerance = 0.001;
  if (Math.abs(actual - expected) > tolerance) {
    errors.push({ type: "error", message });
  }
}

function parseMultiSheetWorkbook(workbook: XLSX.WorkBook): ParseResult | null {
  const jobroleSheet = getWorkbookSheet(workbook, "Jobrole");
  const nosSheet = getWorkbookSheet(workbook, "Nos");

  if (!jobroleSheet || !nosSheet) {
    return null;
  }

  const errors: ValidationError[] = [];
  const jobRoles: ParsedJobRole[] = [];

  const jobroleRows =
    XLSX.utils.sheet_to_json<Record<string, unknown>>(jobroleSheet);
  const nosRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(nosSheet);
  const pcSheet = getWorkbookSheet(workbook, "Pc");
  const pcRows = pcSheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(pcSheet)
    : [];

  if (jobroleRows.length === 0) {
    errors.push({ type: "error", message: 'Sheet "Jobrole" is empty.' });
    return { jobRoles, errors };
  }

  if (nosRows.length === 0) {
    errors.push({ type: "error", message: 'Sheet "Nos" is empty.' });
    return { jobRoles, errors };
  }

  if (!hasHeaders(jobroleRows[0], JOBROLE_SHEET_HEADERS)) {
    errors.push({
      type: "error",
      message: 'Sheet "Jobrole" is missing required column headers.',
      details: JOBROLE_SHEET_HEADERS.join(", "),
    });
  }

  if (!hasHeaders(nosRows[0], NOS_SHEET_HEADERS)) {
    errors.push({
      type: "error",
      message: 'Sheet "Nos" is missing required column headers.',
      details: NOS_SHEET_HEADERS.join(", "),
    });
  }

  if (
    pcSheet &&
    pcRows.length > 0 &&
    !hasHeaders(pcRows[0], PC_SHEET_HEADERS)
  ) {
    errors.push({
      type: "error",
      message: 'Sheet "Pc" is missing required column headers.',
      details: PC_SHEET_HEADERS.join(", "),
    });
  }

  if (errors.length > 0) {
    return { jobRoles, errors };
  }

  const jobRolesMap = new Map<string, ParsedJobRole>();

  jobroleRows.forEach((row, idx) => {
    const lineNum = idx + 2;
    const name = String(row.jobrole_name || "").trim();
    const code = String(row.jobrole_code || "").trim();
    const theory = parseMarksValue(row.theory_marks);
    const practical = parseMarksValue(row.practical_marks);
    const viva = parseMarksValue(row.viva_marks);

    const hasAnyValue = JOBROLE_SHEET_HEADERS.some(
      (header) => !isCellEmpty(row[header])
    );

    if (!hasAnyValue) {
      return;
    }

    if ([theory, practical, viva].some(Number.isNaN)) {
      errors.push({
        type: "error",
        message: `Jobrole row ${lineNum}: Marks must be valid numbers.`,
      });
      return;
    }

    if (
      !name ||
      !code ||
      theory === undefined ||
      practical === undefined ||
      viva === undefined
    ) {
      errors.push({
        type: "error",
        message: `Jobrole row ${lineNum}: name, code, and all marks are required.`,
      });
      return;
    }

    if (jobRolesMap.has(code)) {
      errors.push({
        type: "error",
        message: `Jobrole row ${lineNum}: duplicate job role code "${code}".`,
      });
      return;
    }

    jobRolesMap.set(code, {
      name,
      code,
      total_theory_marks: theory,
      total_practical_marks: practical,
      total_viva_marks: viva,
      nos_list: [],
    });
  });

  nosRows.forEach((row, idx) => {
    const lineNum = idx + 2;
    const jobroleCode = String(row.jobrole_code || "").trim();
    const name = String(row.nos_name || "").trim();
    const code = String(row.nos_code || "").trim();
    const theory = parseMarksValue(row.theory_marks);
    const practical = parseMarksValue(row.practical_marks);
    const viva = parseMarksValue(row.viva_marks);

    const hasAnyValue = NOS_SHEET_HEADERS.some(
      (header) => !isCellEmpty(row[header])
    );

    if (!hasAnyValue) {
      return;
    }

    if ([theory, practical, viva].some(Number.isNaN)) {
      errors.push({
        type: "error",
        message: `Nos row ${lineNum}: Marks must be valid numbers.`,
      });
      return;
    }

    if (
      !jobroleCode ||
      !name ||
      !code ||
      theory === undefined ||
      practical === undefined ||
      viva === undefined
    ) {
      errors.push({
        type: "error",
        message: `Nos row ${lineNum}: jobrole_code, name, code, and all marks are required.`,
      });
      return;
    }

    const jobRole = jobRolesMap.get(jobroleCode);
    if (!jobRole) {
      errors.push({
        type: "error",
        message: `Nos row ${lineNum}: jobrole_code "${jobroleCode}" was not found in the Jobrole sheet.`,
      });
      return;
    }

    const existingNos = jobRole.nos_list.find((nos) => nos.code === code);
    if (existingNos) {
      errors.push({
        type: "error",
        message: `Nos row ${lineNum}: duplicate NOS code "${code}" for job role "${jobroleCode}".`,
      });
      return;
    }

    jobRole.nos_list.push({
      name,
      code,
      total_theory_marks: theory,
      total_practical_marks: practical,
      total_viva_marks: viva,
      pc_list: [],
    });
  });

  pcRows.forEach((row, idx) => {
    const lineNum = idx + 2;
    const jobroleCode = String(row.jobrole_code || "").trim();
    const nosCode = String(row.nos_code || "").trim();
    const name = String(row.pc_name || "").trim();
    const code = String(row.pc_code || "").trim();
    const theory = parseMarksValue(row.theory_marks);
    const practical = parseMarksValue(row.practical_marks);
    const viva = parseMarksValue(row.viva_marks);

    const hasAnyPcValue = PC_SHEET_HEADERS.some(
      (header) => !isCellEmpty(row[header])
    );

    if (!hasAnyPcValue) {
      return;
    }

    const hasPcDetails =
      !isCellEmpty(row.pc_name) ||
      !isCellEmpty(row.pc_code) ||
      !isCellEmpty(row.theory_marks) ||
      !isCellEmpty(row.practical_marks) ||
      !isCellEmpty(row.viva_marks);

    if (!hasPcDetails) {
      return;
    }

    if ([theory, practical, viva].some(Number.isNaN)) {
      errors.push({
        type: "error",
        message: `Pc row ${lineNum}: Marks must be valid numbers.`,
      });
      return;
    }

    if (
      !jobroleCode ||
      !nosCode ||
      !name ||
      !code ||
      theory === undefined ||
      practical === undefined ||
      viva === undefined
    ) {
      errors.push({
        type: "error",
        message: `Pc row ${lineNum}: jobrole_code, nos_code, name, pc_code, and all marks are required when PC data is present.`,
      });
      return;
    }

    const jobRole = jobRolesMap.get(jobroleCode);
    if (!jobRole) {
      errors.push({
        type: "error",
        message: `Pc row ${lineNum}: jobrole_code "${jobroleCode}" was not found in the Jobrole sheet.`,
      });
      return;
    }

    const nos = jobRole.nos_list.find((item) => item.code === nosCode);
    if (!nos) {
      errors.push({
        type: "error",
        message: `Pc row ${lineNum}: nos_code "${nosCode}" was not found for job role "${jobroleCode}".`,
      });
      return;
    }

    if (nos.pc_list.some((pc) => pc.code === code)) {
      errors.push({
        type: "warning",
        message: `Pc row ${lineNum}: duplicate PC code "${code}" in NOS "${nosCode}". Skipping duplicate.`,
      });
      return;
    }

    nos.pc_list.push({
      name,
      code,
      total_theory_marks: theory,
      total_practical_marks: practical,
      total_viva_marks: viva,
    });
  });

  jobRolesMap.forEach((jobRole) => {
    let totalNosTheory = 0;
    let totalNosPractical = 0;
    let totalNosViva = 0;

    jobRole.nos_list.forEach((nos) => {
      totalNosTheory += nos.total_theory_marks;
      totalNosPractical += nos.total_practical_marks;
      totalNosViva += nos.total_viva_marks;

      if (nos.pc_list.length === 0) {
        return;
      }

      const totalPcTheory = nos.pc_list.reduce(
        (sum, pc) => sum + pc.total_theory_marks,
        0
      );
      const totalPcPractical = nos.pc_list.reduce(
        (sum, pc) => sum + pc.total_practical_marks,
        0
      );
      const totalPcViva = nos.pc_list.reduce(
        (sum, pc) => sum + pc.total_viva_marks,
        0
      );

      validateMarksSum(
        totalPcTheory,
        nos.total_theory_marks,
        `NOS "${nos.code}" Marks Mismatch: PC Theory sum (${totalPcTheory}) does not match NOS Theory (${nos.total_theory_marks}).`,
        errors
      );
      validateMarksSum(
        totalPcPractical,
        nos.total_practical_marks,
        `NOS "${nos.code}" Marks Mismatch: PC Practical sum (${totalPcPractical}) does not match NOS Practical (${nos.total_practical_marks}).`,
        errors
      );
      validateMarksSum(
        totalPcViva,
        nos.total_viva_marks,
        `NOS "${nos.code}" Marks Mismatch: PC Viva sum (${totalPcViva}) does not match NOS Viva (${nos.total_viva_marks}).`,
        errors
      );
    });

    validateMarksSum(
      totalNosTheory,
      jobRole.total_theory_marks,
      `Job Role "${jobRole.code}" Marks Mismatch: NOS Theory sum (${totalNosTheory}) does not match Job Role Theory (${jobRole.total_theory_marks}).`,
      errors
    );
    validateMarksSum(
      totalNosPractical,
      jobRole.total_practical_marks,
      `Job Role "${jobRole.code}" Marks Mismatch: NOS Practical sum (${totalNosPractical}) does not match Job Role Practical (${jobRole.total_practical_marks}).`,
      errors
    );
    validateMarksSum(
      totalNosViva,
      jobRole.total_viva_marks,
      `Job Role "${jobRole.code}" Marks Mismatch: NOS Viva sum (${totalNosViva}) does not match Job Role Viva (${jobRole.total_viva_marks}).`,
      errors
    );

    jobRoles.push(jobRole);
  });

  return { jobRoles, errors };
}

function parseLegacyFlatWorkbook(workbook: XLSX.WorkBook): ParseResult {
  const errors: ValidationError[] = [];
  const jobRoles: ParsedJobRole[] = [];

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    errors.push({ type: "error", message: "Excel file has no worksheets." });
    return { jobRoles, errors };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  if (rawData.length === 0) {
    errors.push({ type: "error", message: "Excel sheet is empty." });
    return { jobRoles, errors };
  }

  const firstRowKeys = Object.keys(rawData[0]);
  const isFullTemplate = LEGACY_TEMPLATE_HEADERS.every((header) =>
    firstRowKeys.includes(header)
  );
  const isNosOnlyTemplate = LEGACY_NOS_ONLY_TEMPLATE_HEADERS.every((header) =>
    firstRowKeys.includes(header)
  );

  if (!isFullTemplate && !isNosOnlyTemplate) {
    const missingHeaders = LEGACY_TEMPLATE_HEADERS.filter(
      (header) => !firstRowKeys.includes(header)
    );
    const missingNosOnlyHeaders = LEGACY_NOS_ONLY_TEMPLATE_HEADERS.filter(
      (header) => !firstRowKeys.includes(header)
    );
    errors.push({
      type: "error",
      message: "Excel sheet is missing required column headers.",
      details: `Full template missing: ${
        missingHeaders.join(", ") || "none"
      } | NOS-only template missing: ${
        missingNosOnlyHeaders.join(", ") || "none"
      }`,
    });
    return { jobRoles, errors };
  }

  const jobRolesMap = new Map<string, ParsedJobRole>();
  let currentJobRole: {
    name: string;
    code: string;
    total_theory_marks: number;
    total_practical_marks: number;
    total_viva_marks: number;
  } | null = null;
  let currentNos: {
    job_role_code: string;
    name: string;
    code: string;
    total_theory_marks: number;
    total_practical_marks: number;
    total_viva_marks: number;
  } | null = null;

  rawData.forEach((row, idx) => {
    const lineNum = idx + 2;
    const jrName = String(row.job_role_name || "").trim();
    const jrCode = String(row.job_role_code || "").trim();
    const jrTheory = parseMarksValue(row.job_role_theory_marks);
    const jrPractical = parseMarksValue(row.job_role_practical_marks);
    const jrViva = parseMarksValue(row.job_role_viva_marks);

    const nosName = String(row.nos_name || "").trim();
    const nosCode = String(row.nos_code || "").trim();
    const nosTheory = parseMarksValue(row.nos_theory_marks);
    const nosPractical = parseMarksValue(row.nos_practical_marks);
    const nosViva = parseMarksValue(row.nos_viva_marks);

    const hasJobRoleData = LEGACY_TEMPLATE_HEADERS.slice(0, 5).some(
      (header) => !isCellEmpty(row[header])
    );
    const hasNosData = LEGACY_TEMPLATE_HEADERS.slice(5, 10).some(
      (header) => !isCellEmpty(row[header])
    );

    if (
      [jrTheory, jrPractical, jrViva, nosTheory, nosPractical, nosViva].some(
        Number.isNaN
      )
    ) {
      errors.push({
        type: "error",
        message: `Row ${lineNum}: Marks must be valid numbers.`,
      });
      return;
    }

    let resolvedJobRole: NonNullable<typeof currentJobRole>;
    if (hasJobRoleData) {
      if (
        !jrName ||
        !jrCode ||
        jrTheory === undefined ||
        jrPractical === undefined ||
        jrViva === undefined
      ) {
        errors.push({
          type: "error",
          message: `Row ${lineNum}: Job Role rows must include name, code, and all Job Role marks.`,
        });
        return;
      }

      resolvedJobRole = {
        name: jrName,
        code: jrCode,
        total_theory_marks: jrTheory,
        total_practical_marks: jrPractical,
        total_viva_marks: jrViva,
      };
      currentJobRole = resolvedJobRole;

      if (!currentNos || currentNos.job_role_code !== jrCode) {
        currentNos = null;
      }
    } else {
      if (!currentJobRole) {
        errors.push({
          type: "error",
          message: `Row ${lineNum}: Job Role details are missing. Add them to this row or the row above.`,
        });
        return;
      }
      resolvedJobRole = currentJobRole;
    }

    let resolvedNos: NonNullable<typeof currentNos>;
    if (hasNosData) {
      if (
        !nosName ||
        !nosCode ||
        nosTheory === undefined ||
        nosPractical === undefined ||
        nosViva === undefined
      ) {
        errors.push({
          type: "error",
          message: `Row ${lineNum}: NOS rows must include name, code, and all NOS marks.`,
        });
        return;
      }

      resolvedNos = {
        job_role_code: resolvedJobRole.code,
        name: nosName,
        code: nosCode,
        total_theory_marks: nosTheory,
        total_practical_marks: nosPractical,
        total_viva_marks: nosViva,
      };
      currentNos = resolvedNos;
    } else {
      if (!currentNos || currentNos.job_role_code !== resolvedJobRole.code) {
        errors.push({
          type: "error",
          message: `Row ${lineNum}: NOS details are missing. Add them to this row or the row above.`,
        });
        return;
      }
      resolvedNos = currentNos;
    }

    if (!jobRolesMap.has(resolvedJobRole.code)) {
      jobRolesMap.set(resolvedJobRole.code, {
        name: resolvedJobRole.name,
        code: resolvedJobRole.code,
        total_theory_marks: resolvedJobRole.total_theory_marks,
        total_practical_marks: resolvedJobRole.total_practical_marks,
        total_viva_marks: resolvedJobRole.total_viva_marks,
        nos_list: [],
      });
    }

    const jobRole = jobRolesMap.get(resolvedJobRole.code)!;
    if (
      jobRole.name !== resolvedJobRole.name ||
      jobRole.total_theory_marks !== resolvedJobRole.total_theory_marks ||
      jobRole.total_practical_marks !== resolvedJobRole.total_practical_marks ||
      jobRole.total_viva_marks !== resolvedJobRole.total_viva_marks
    ) {
      errors.push({
        type: "error",
        message: `Row ${lineNum}: Job Role code "${resolvedJobRole.code}" has conflicting details in multiple rows.`,
      });
      return;
    }

    let nos = jobRole.nos_list.find((item) => item.code === resolvedNos.code);

    if (!nos) {
      nos = {
        name: resolvedNos.name,
        code: resolvedNos.code,
        total_theory_marks: resolvedNos.total_theory_marks,
        total_practical_marks: resolvedNos.total_practical_marks,
        total_viva_marks: resolvedNos.total_viva_marks,
        pc_list: [],
      };
      jobRole.nos_list.push(nos);
    } else if (
      nos.name !== resolvedNos.name ||
      nos.total_theory_marks !== resolvedNos.total_theory_marks ||
      nos.total_practical_marks !== resolvedNos.total_practical_marks ||
      nos.total_viva_marks !== resolvedNos.total_viva_marks
    ) {
      errors.push({
        type: "error",
        message: `Row ${lineNum}: NOS code "${resolvedNos.code}" has conflicting details in multiple rows.`,
      });
      return;
    }

    if (isNosOnlyTemplate) {
      return;
    }

    const pcName = String(row.pc_name || "").trim();
    const pcCode = String(row.pc_code || "").trim();
    const pcTheory = parseMarksValue(row.pc_theory_marks);
    const pcPractical = parseMarksValue(row.pc_practical_marks);
    const pcViva = parseMarksValue(row.pc_viva_marks);

    if ([pcTheory, pcPractical, pcViva].some(Number.isNaN)) {
      errors.push({
        type: "error",
        message: `Row ${lineNum}: Marks must be valid numbers.`,
      });
      return;
    }

    const hasPcDetails =
      !isCellEmpty(row.pc_name) ||
      !isCellEmpty(row.pc_code) ||
      !isCellEmpty(row.pc_theory_marks) ||
      !isCellEmpty(row.pc_practical_marks) ||
      !isCellEmpty(row.pc_viva_marks);

    if (!hasPcDetails) {
      return;
    }

    if (!pcName || !pcCode) {
      errors.push({
        type: "error",
        message: `Row ${lineNum}: Missing PC Name or Code.`,
      });
      return;
    }
    if (
      pcTheory === undefined ||
      pcPractical === undefined ||
      pcViva === undefined
    ) {
      errors.push({
        type: "error",
        message: `Row ${lineNum}: PC rows must include all PC marks.`,
      });
      return;
    }

    if (nos.pc_list.some((pc) => pc.code === pcCode)) {
      errors.push({
        type: "warning",
        message: `Row ${lineNum}: Duplicate PC code "${pcCode}" in NOS "${nosCode}". Skipping duplicate.`,
      });
      return;
    }

    nos.pc_list.push({
      name: pcName,
      code: pcCode,
      total_theory_marks: pcTheory,
      total_practical_marks: pcPractical,
      total_viva_marks: pcViva,
    });
  });

  jobRolesMap.forEach((jobRole) => {
    let totalNosTheory = 0;
    let totalNosPractical = 0;
    let totalNosViva = 0;

    jobRole.nos_list.forEach((nos) => {
      totalNosTheory += nos.total_theory_marks;
      totalNosPractical += nos.total_practical_marks;
      totalNosViva += nos.total_viva_marks;

      if (nos.pc_list.length === 0) {
        return;
      }

      const totalPcTheory = nos.pc_list.reduce(
        (sum, pc) => sum + pc.total_theory_marks,
        0
      );
      const totalPcPractical = nos.pc_list.reduce(
        (sum, pc) => sum + pc.total_practical_marks,
        0
      );
      const totalPcViva = nos.pc_list.reduce(
        (sum, pc) => sum + pc.total_viva_marks,
        0
      );

      validateMarksSum(
        totalPcTheory,
        nos.total_theory_marks,
        `NOS "${nos.code}" Marks Mismatch: PC Theory sum (${totalPcTheory}) does not match NOS Theory (${nos.total_theory_marks}).`,
        errors
      );
      validateMarksSum(
        totalPcPractical,
        nos.total_practical_marks,
        `NOS "${nos.code}" Marks Mismatch: PC Practical sum (${totalPcPractical}) does not match NOS Practical (${nos.total_practical_marks}).`,
        errors
      );
      validateMarksSum(
        totalPcViva,
        nos.total_viva_marks,
        `NOS "${nos.code}" Marks Mismatch: PC Viva sum (${totalPcViva}) does not match NOS Viva (${nos.total_viva_marks}).`,
        errors
      );
    });

    validateMarksSum(
      totalNosTheory,
      jobRole.total_theory_marks,
      `Job Role "${jobRole.code}" Marks Mismatch: NOS Theory sum (${totalNosTheory}) does not match Job Role Theory (${jobRole.total_theory_marks}).`,
      errors
    );
    validateMarksSum(
      totalNosPractical,
      jobRole.total_practical_marks,
      `Job Role "${jobRole.code}" Marks Mismatch: NOS Practical sum (${totalNosPractical}) does not match Job Role Practical (${jobRole.total_practical_marks}).`,
      errors
    );
    validateMarksSum(
      totalNosViva,
      jobRole.total_viva_marks,
      `Job Role "${jobRole.code}" Marks Mismatch: NOS Viva sum (${totalNosViva}) does not match Job Role Viva (${jobRole.total_viva_marks}).`,
      errors
    );

    jobRoles.push(jobRole);
  });

  return { jobRoles, errors };
}

export function parseExcelFile(arrayBuffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    return (
      parseMultiSheetWorkbook(workbook) ?? parseLegacyFlatWorkbook(workbook)
    );
  } catch (err: any) {
    return {
      jobRoles: [],
      errors: [
        {
          type: "error",
          message: "An unexpected error occurred while parsing the file.",
          details: err.message,
        },
      ],
    };
  }
}
