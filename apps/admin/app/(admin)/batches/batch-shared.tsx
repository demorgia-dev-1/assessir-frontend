// Shared helpers/components for the batch detail + candidates pages.

export const INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export const ATTENDANCE_TEST_TYPES = [
  {
    value: "theory",
    label: "Theory",
    testKey: "theory_test",
    idKey: "theory_test_id",
  },
  {
    value: "practical",
    label: "Practical",
    testKey: "practical_test",
    idKey: "practical_test_id",
  },
  { value: "viva", label: "Viva", testKey: "viva_test", idKey: "viva_test_id" },
] as const;

export type AttendanceTestType = "theory" | "practical" | "viva";

// The test types a batch actually has configured.
export function getAttendanceTestOptions(batch: any) {
  if (!batch) return [];
  return ATTENDANCE_TEST_TYPES.filter(
    (type) => Boolean(batch[type.testKey]) || Boolean(batch[type.idKey])
  );
}

// Resolve the test id for a given test type from a batch.
export function getTestIdForType(batch: any, type: AttendanceTestType) {
  return batch?.[`${type}_test`]?.id ?? batch?.[`${type}_test_id`] ?? null;
}

export function getBatchJobRoleName(batch: any) {
  return (
    batch?.jobRole?.name ||
    batch?.job_role?.name ||
    batch?.jobrole?.name ||
    `Job Role ${batch?.job_role_id || "N/A"}`
  );
}

export function getExamLoginUrl(batchId: string | number) {
  const base =
    process.env.NEXT_PUBLIC_CANDIDATE_APP_URL || "http://localhost:3002";
  return `${base}/batches/${batchId}/exam/login`;
}

// Canonicalize the status string from the API into a lookup key
// ("not initialized" → "not_initialized", "in_progress" stays).
export function canonicalExamStatus(raw: any): string {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

// Only the statuses the API actually returns.
export const EXAM_STATUS_META: Record<
  string,
  { label: string; badge: string }
> = {
  not_initialized: {
    label: "Not Initialized",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  disconnected: {
    label: "Disconnected",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  paused: {
    label: "Paused",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  resume: {
    label: "Resume",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  authorized: {
    label: "Authorized",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  unauthorized: {
    label: "Unauthorized",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

export function examStatusLabel(canonical: string): string {
  return (
    EXAM_STATUS_META[canonical]?.label ??
    canonical.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Absolute short date-time (e.g. "17 Jul, 12:59 PM") for start/end timestamps.
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Relative "x ago" for the candidate's last heartbeat timestamp.
export function formatHeartbeat(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 0) return date.toLocaleString();
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleString();
}

export function TestDetailsSection({
  test,
  type,
  status,
  statusLoading,
}: {
  test: any;
  type: string;
  status?: string;
  statusLoading?: boolean;
}) {
  if (!test) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 capitalize">
            {type} Test
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {test.Name || `${type} Test`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusLoading ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              …
            </span>
          ) : status ? (
            <span
              title="Test status"
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                EXAM_STATUS_META[status]?.badge ??
                "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {examStatusLabel(status)}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
            {test.time_in_minutes || 0} mins
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {(test.sections || []).map((sec: any) => (
          <div key={sec.id} className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {sec.Name || "Section"}
            </h5>
            <div className="space-y-3">
              {(sec.questions || []).map((q: any, qIdx: number) => {
                const metadata =
                  q.metadata && typeof q.metadata !== "string"
                    ? q.metadata
                    : null;
                return (
                  <div
                    key={q.id || qIdx}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          Question {qIdx + 1}
                        </span>
                        <div
                          className="text-slate-900 font-medium leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.text }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10 uppercase tracking-wide">
                          {q.nos?.code || q.nos?.nos_code || q.nos_code || "NOS"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800">
                          {q.correct_mark ? `+${q.correct_mark}` : "0"} Marks
                        </span>
                      </div>
                    </div>

                    {q.type === "mcq" && metadata?.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-50 mt-1">
                        {metadata.options.map((opt: any, optIdx: number) => (
                          <div
                            key={opt.id || optIdx}
                            className={`rounded-lg border px-3 py-2 text-left ${
                              opt.is_correct
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold"
                                : "border-slate-100 bg-slate-50/50 text-slate-600"
                            }`}
                          >
                            <span className="mr-1.5 opacity-60">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span
                              dangerouslySetInnerHTML={{ __html: opt.text }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
