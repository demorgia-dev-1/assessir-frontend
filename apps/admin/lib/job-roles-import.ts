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

const TEMPLATE_HEADERS = [
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
];

const NOS_ONLY_TEMPLATE_HEADERS = [
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
];

const TEMPLATE_ROWS = [
  {
    job_role_name: "Backend Developer Node.js",
    job_role_code: "QP-COMP-NODE-2026",
    job_role_theory_marks: 35.5,
    job_role_practical_marks: 45.0,
    job_role_viva_marks: 19.5,
    nos_name: "Build REST APIs",
    nos_code: "NOS-NODE-001",
    nos_theory_marks: 15.5,
    nos_practical_marks: 20.0,
    nos_viva_marks: 9.5,
    pc_name: "Implement CRUD APIs",
    pc_code: "PC-NODE-001",
    pc_theory_marks: 8.0,
    pc_practical_marks: 10.0,
    pc_viva_marks: 5.0,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "",
    nos_code: "",
    nos_theory_marks: "",
    nos_practical_marks: "",
    nos_viva_marks: "",
    pc_name: "JWT Authentication",
    pc_code: "PC-NODE-002",
    pc_theory_marks: 7.5,
    pc_practical_marks: 10.0,
    pc_viva_marks: 4.5,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "Database Integration",
    nos_code: "NOS-NODE-002",
    nos_theory_marks: 20.0,
    nos_practical_marks: 25.0,
    nos_viva_marks: 10.0,
    pc_name: "MongoDB Integration",
    pc_code: "PC-NODE-003",
    pc_theory_marks: 10.0,
    pc_practical_marks: 12.0,
    pc_viva_marks: 5.0,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "",
    nos_code: "",
    nos_theory_marks: "",
    nos_practical_marks: "",
    nos_viva_marks: "",
    pc_name: "Postgres Integration",
    pc_code: "PC-NODE-004",
    pc_theory_marks: 10.0,
    pc_practical_marks: 13.0,
    pc_viva_marks: 5.0,
  },
  {
    job_role_name: "Frontend Developer React",
    job_role_code: "QP-COMP-REACT-2026",
    job_role_theory_marks: 30.0,
    job_role_practical_marks: 50.0,
    job_role_viva_marks: 20.0,
    nos_name: "Build UI Components",
    nos_code: "NOS-REACT-001",
    nos_theory_marks: 15.0,
    nos_practical_marks: 25.0,
    nos_viva_marks: 10.0,
    pc_name: "Reusable Components",
    pc_code: "PC-REACT-001",
    pc_theory_marks: 7.0,
    pc_practical_marks: 12.0,
    pc_viva_marks: 5.0,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "",
    nos_code: "",
    nos_theory_marks: "",
    nos_practical_marks: "",
    nos_viva_marks: "",
    pc_name: "State Management",
    pc_code: "PC-REACT-002",
    pc_theory_marks: 8.0,
    pc_practical_marks: 13.0,
    pc_viva_marks: 5.0,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "API Integration",
    nos_code: "NOS-REACT-002",
    nos_theory_marks: 15.0,
    nos_practical_marks: 25.0,
    nos_viva_marks: 10.0,
    pc_name: "Fetch API",
    pc_code: "PC-REACT-003",
    pc_theory_marks: 7.0,
    pc_practical_marks: 12.0,
    pc_viva_marks: 5.0,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "",
    nos_code: "",
    nos_theory_marks: "",
    nos_practical_marks: "",
    nos_viva_marks: "",
    pc_name: "Error Handling",
    pc_code: "PC-REACT-004",
    pc_theory_marks: 8.0,
    pc_practical_marks: 13.0,
    pc_viva_marks: 5.0,
  },
];

const NOS_ONLY_TEMPLATE_ROWS = [
  {
    job_role_name: "Backend Developer Node.js",
    job_role_code: "QP-COMP-NODE-2026",
    job_role_theory_marks: 35.5,
    job_role_practical_marks: 45.0,
    job_role_viva_marks: 19.5,
    nos_name: "Build REST APIs",
    nos_code: "NOS-NODE-001",
    nos_theory_marks: 15.5,
    nos_practical_marks: 20.0,
    nos_viva_marks: 9.5,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "Database Integration",
    nos_code: "NOS-NODE-002",
    nos_theory_marks: 20.0,
    nos_practical_marks: 25.0,
    nos_viva_marks: 10.0,
  },
  {
    job_role_name: "Frontend Developer React",
    job_role_code: "QP-COMP-REACT-2026",
    job_role_theory_marks: 30.0,
    job_role_practical_marks: 50.0,
    job_role_viva_marks: 20.0,
    nos_name: "Build UI Components",
    nos_code: "NOS-REACT-001",
    nos_theory_marks: 15.0,
    nos_practical_marks: 25.0,
    nos_viva_marks: 10.0,
  },
  {
    job_role_name: "",
    job_role_code: "",
    job_role_theory_marks: "",
    job_role_practical_marks: "",
    job_role_viva_marks: "",
    nos_name: "API Integration",
    nos_code: "NOS-REACT-002",
    nos_theory_marks: 15.0,
    nos_practical_marks: 25.0,
    nos_viva_marks: 10.0,
  },
];

export function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS, {
    header: TEMPLATE_HEADERS,
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Job Roles Template");

  // Adjust column widths automatically
  const maxW = TEMPLATE_HEADERS.map((h) => ({
    wch: Math.max(h.length + 3, 14),
  }));
  ws["!cols"] = maxW;

  XLSX.writeFile(wb, "job_roles_template.xlsx");
}

export function downloadNosOnlyTemplate() {
  const ws = XLSX.utils.json_to_sheet(NOS_ONLY_TEMPLATE_ROWS, {
    header: NOS_ONLY_TEMPLATE_HEADERS,
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NOS Only Template");

  const maxW = NOS_ONLY_TEMPLATE_HEADERS.map((h) => ({
    wch: Math.max(h.length + 3, 14),
  }));
  ws["!cols"] = maxW;

  XLSX.writeFile(wb, "job_roles_nos_only_template.xlsx");
}

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

export function parseExcelFile(arrayBuffer: ArrayBuffer): ParseResult {
  const errors: ValidationError[] = [];
  const jobRoles: ParsedJobRole[] = [];

  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push({ type: "error", message: "Excel file has no worksheets." });
      return { jobRoles, errors };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

    if (rawData.length === 0) {
      errors.push({ type: "error", message: "Excel sheet is empty." });
      return { jobRoles, errors };
    }

    const firstRowKeys = Object.keys(rawData[0]);
    const isFullTemplate = TEMPLATE_HEADERS.every((h) =>
      firstRowKeys.includes(h)
    );
    const isNosOnlyTemplate = NOS_ONLY_TEMPLATE_HEADERS.every((h) =>
      firstRowKeys.includes(h)
    );

    if (!isFullTemplate && !isNosOnlyTemplate) {
      const missingHeaders = TEMPLATE_HEADERS.filter(
        (h) => !firstRowKeys.includes(h)
      );
      const missingNosOnlyHeaders = NOS_ONLY_TEMPLATE_HEADERS.filter(
        (h) => !firstRowKeys.includes(h)
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
      const lineNum = idx + 2; // header is line 1, rows start from 2
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

      const hasJobRoleData = TEMPLATE_HEADERS.slice(0, 5).some(
        (header) => !isCellEmpty(row[header])
      );
      const hasNosData = TEMPLATE_HEADERS.slice(5, 10).some(
        (header) => !isCellEmpty(row[header])
      );

      if (
        [
          jrTheory,
          jrPractical,
          jrViva,
          nosTheory,
          nosPractical,
          nosViva,
        ].some(Number.isNaN)
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

      // Grouping logic
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
        jobRole.total_practical_marks !==
          resolvedJobRole.total_practical_marks ||
        jobRole.total_viva_marks !== resolvedJobRole.total_viva_marks
      ) {
        errors.push({
          type: "error",
          message: `Row ${lineNum}: Job Role code "${resolvedJobRole.code}" has conflicting details in multiple rows.`,
        });
        return;
      }

      let nos = jobRole.nos_list.find((n) => n.code === resolvedNos.code);

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

      // Check if duplicate PC code in the same NOS
      if (nos.pc_list.some((p) => p.code === pcCode)) {
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

    // Validate marks sums
    jobRolesMap.forEach((jr) => {
      let totalNosTheory = 0;
      let totalNosPractical = 0;
      let totalNosViva = 0;

      jr.nos_list.forEach((nos) => {
        let totalPcTheory = 0;
        let totalPcPractical = 0;
        let totalPcViva = 0;

        nos.pc_list.forEach((pc) => {
          totalPcTheory += pc.total_theory_marks;
          totalPcPractical += pc.total_practical_marks;
          totalPcViva += pc.total_viva_marks;
        });

        // Use close-to-zero float comparison to avoid JavaScript rounding inaccuracies
        const tolerance = 0.001;
        if (nos.pc_list.length > 0) {
          if (Math.abs(totalPcTheory - nos.total_theory_marks) > tolerance) {
            errors.push({
              type: "error",
              message: `NOS "${nos.code}" Marks Mismatch: PC Theory sum (${totalPcTheory}) does not match NOS Theory (${nos.total_theory_marks}).`,
            });
          }
          if (
            Math.abs(totalPcPractical - nos.total_practical_marks) > tolerance
          ) {
            errors.push({
              type: "error",
              message: `NOS "${nos.code}" Marks Mismatch: PC Practical sum (${totalPcPractical}) does not match NOS Practical (${nos.total_practical_marks}).`,
            });
          }
          if (Math.abs(totalPcViva - nos.total_viva_marks) > tolerance) {
            errors.push({
              type: "error",
              message: `NOS "${nos.code}" Marks Mismatch: PC Viva sum (${totalPcViva}) does not match NOS Viva (${nos.total_viva_marks}).`,
            });
          }
        }

        totalNosTheory += nos.total_theory_marks;
        totalNosPractical += nos.total_practical_marks;
        totalNosViva += nos.total_viva_marks;
      });

      const tolerance = 0.001;
      if (Math.abs(totalNosTheory - jr.total_theory_marks) > tolerance) {
        errors.push({
          type: "error",
          message: `Job Role "${jr.code}" Marks Mismatch: NOS Theory sum (${totalNosTheory}) does not match Job Role Theory (${jr.total_theory_marks}).`,
        });
      }
      if (Math.abs(totalNosPractical - jr.total_practical_marks) > tolerance) {
        errors.push({
          type: "error",
          message: `Job Role "${jr.code}" Marks Mismatch: NOS Practical sum (${totalNosPractical}) does not match Job Role Practical (${jr.total_practical_marks}).`,
        });
      }
      if (Math.abs(totalNosViva - jr.total_viva_marks) > tolerance) {
        errors.push({
          type: "error",
          message: `Job Role "${jr.code}" Marks Mismatch: NOS Viva sum (${totalNosViva}) does not match Job Role Viva (${jr.total_viva_marks}).`,
        });
      }

      jobRoles.push(jr);
    });
  } catch (err: any) {
    errors.push({
      type: "error",
      message: "An unexpected error occurred while parsing the file.",
      details: err.message,
    });
  }

  return { jobRoles, errors };
}
