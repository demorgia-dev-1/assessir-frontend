"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FiArrowLeft, FiCopy, FiExternalLink, FiUsers } from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSelectedBatch,
  fetchBatchById,
} from "@/store/slices/batches-slice";
import api from "@/lib/api";
import {
  TestDetailsSection,
  canonicalExamStatus,
  getBatchJobRoleName,
  getExamLoginUrl,
  getTestIdForType,
} from "../batch-shared";

function BatchDetailsInner() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId");

  const { selectedBatch, viewLoading } = useAppSelector(
    (state) => state.batches
  );

  const [testStatuses, setTestStatuses] = useState<Record<string, string>>({});
  const [testStatusLoading, setTestStatusLoading] = useState(false);

  useEffect(() => {
    if (batchId) {
      dispatch(fetchBatchById(batchId));
    }
    return () => {
      dispatch(clearSelectedBatch());
    };
  }, [dispatch, batchId]);

  // Fetch each test's status.
  useEffect(() => {
    if (!selectedBatch) return;
    const types: ("theory" | "practical" | "viva")[] = [
      "theory",
      "practical",
      "viva",
    ];
    const targets = types
      .map((type) => ({ type, testId: getTestIdForType(selectedBatch, type) }))
      .filter((target) => target.testId);
    if (!targets.length) {
      setTestStatuses({});
      return;
    }

    let active = true;
    setTestStatusLoading(true);
    Promise.all(
      targets.map(async ({ type, testId }) => {
        try {
          const res = await api.get(
            `/batches/${selectedBatch.id}/exam/status?test_id=${testId}`
          );
          const raw =
            res.data?.status ??
            res.data?.exam_status ??
            res.data?.data?.status ??
            res.data;
          return [type, canonicalExamStatus(raw)] as const;
        } catch {
          return [type, ""] as const;
        }
      })
    ).then((entries) => {
      if (!active) return;
      setTestStatuses(Object.fromEntries(entries.filter(([, s]) => s)));
      setTestStatusLoading(false);
    });

    return () => {
      active = false;
    };
  }, [selectedBatch]);

  const examUrl = selectedBatch ? getExamLoginUrl(selectedBatch.id) : "";

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-6 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/batches")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Batch Details
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {selectedBatch?.name || "Batch"}
              </h1>
              {selectedBatch && (
                <p className="mt-1 text-sm text-slate-600">
                  #{selectedBatch.id} · {getBatchJobRoleName(selectedBatch)}
                </p>
              )}
            </div>
          </div>
          {selectedBatch && (
            <button
              type="button"
              onClick={() =>
                router.push(`/batches/candidates?batchId=${selectedBatch.id}`)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <FiUsers className="h-4 w-4" />
              Candidates
            </button>
          )}
        </div>
      </header>

      <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
        {viewLoading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        ) : selectedBatch ? (
          <div className="space-y-5">
            {/* Candidate Exam Link */}
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 mb-2">
                Candidate Exam Link
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden rounded-xl border border-sky-200 bg-white px-3 py-2.5">
                  <p className="truncate text-xs font-mono text-slate-600">
                    {examUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(examUrl);
                    toast.success("Exam link copied to clipboard!");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                  title="Copy Link"
                >
                  <FiCopy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <a
                  href={examUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                  title="Open Exam Link"
                >
                  <FiExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              </div>
            </div>

            <div className="space-y-5">
              <TestDetailsSection
                test={selectedBatch.theory_test}
                type="theory"
                status={testStatuses.theory}
                statusLoading={testStatusLoading}
              />
              <TestDetailsSection
                test={selectedBatch.practical_test}
                type="practical"
                status={testStatuses.practical}
                statusLoading={testStatusLoading}
              />
              <TestDetailsSection
                test={selectedBatch.viva_test}
                type="viva"
                status={testStatuses.viva}
                statusLoading={testStatusLoading}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No batch selected.</p>
        )}
      </div>
    </section>
  );
}

export default function BatchDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <BatchDetailsInner />
    </Suspense>
  );
}
