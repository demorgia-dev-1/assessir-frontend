"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowLeft,
  FiImage,
  FiVideo,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCandidates } from "@/store/slices/candidates-slice";
import type { CandidateSession } from "@/store/slices/candidates-slice";
import api from "@/lib/api";
import {
  EXAM_STATUS_META,
  canonicalExamStatus,
  examStatusLabel,
  formatDateTime,
} from "../../../batch-shared";

type EvidenceTab = "recordings" | "suspicious";

function testTypeLabel(type?: string | null) {
  if (!type) return "Session";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function sessionStatusBadge(status?: string | null) {
  const canonical = canonicalExamStatus(status);
  const meta = EXAM_STATUS_META[canonical];
  return {
    label: canonical ? examStatusLabel(canonical) : "—",
    badge: meta?.badge ?? "bg-slate-100 text-slate-600 border-slate-200",
  };
}

/* ------------------------------------------------------------------ *
 * Recordings — the session recording arrives as an ordered list of
 * presigned video chunks (~1 per minute). We stitch them into a single
 * player that auto-advances chunk to chunk and lets you jump around.
 * ------------------------------------------------------------------ */

type Chunk = {
  url: string;
  /** Capture time in epoch ms, parsed from the object key when present. */
  time: number | null;
};

// Chunk object keys end in an epoch-ms timestamp (…/sessions/8/1785993300357).
function chunkTimeFromUrl(url: string): number | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const value = Number(last);
    return Number.isFinite(value) && last.length >= 10 ? value : null;
  } catch {
    return null;
  }
}

function extractChunks(data: any): Chunk[] {
  const list =
    (Array.isArray(data) && data) ||
    data?.urls ||
    data?.recordings ||
    data?.data?.urls ||
    data?.data?.recordings ||
    data?.data ||
    data?.results ||
    [];
  if (!Array.isArray(list)) return [];

  return list
    .map((item: any): Chunk | null => {
      const url =
        typeof item === "string"
          ? item
          : item?.url ??
            item?.URL ??
            item?.signed_url ??
            item?.recording_url ??
            item?.video_url ??
            item?.link ??
            "";
      if (!url) return null;
      return { url, time: chunkTimeFromUrl(url) };
    })
    .filter((item): item is Chunk => Boolean(item))
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

// Seconds since the recording's first chunk, as mm:ss (for chunk labels).
function offsetLabel(chunks: Chunk[], index: number): string {
  const base = chunks[0]?.time ?? null;
  const current = chunks[index]?.time ?? null;
  if (base == null || current == null) return `Part ${index + 1}`;
  const totalSec = Math.max(0, Math.round((current - base) / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function RecordingsPanel({
  batchId,
  candidateId,
  sessionId,
}: {
  batchId: string;
  candidateId: string;
  sessionId: string | number;
}) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get(
        `/batches/${batchId}/candidates/${candidateId}/sessions/${sessionId}/recordings`,
        { signal: controller.signal }
      )
      .then((response) => {
        setChunks(extractChunks(response.data));
      })
      .catch((err: any) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError")
          return;
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "Failed to load recordings for this session."
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [batchId, candidateId, sessionId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="aspect-video animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  if (!chunks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
        <FiVideo className="mx-auto mb-2 h-7 w-7 text-slate-400" />
        <h5 className="text-sm font-bold text-slate-950">
          No recordings found
        </h5>
        <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
          This session has no video evidence available yet.
        </p>
      </div>
    );
  }

  const startedAt = chunks[0]?.time
    ? formatDateTime(new Date(chunks[0].time).toISOString())
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">
          {chunks.length} recording{chunks.length === 1 ? "" : "s"}
        </p>
        {startedAt && (
          <span className="text-[11px] text-slate-400">
            Started {startedAt}
          </span>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {chunks.map((chunk, chunkIndex) => (
          <figure
            key={chunk.url}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <video
              src={chunk.url}
              controls
              preload="metadata"
              className="aspect-video w-full bg-slate-950"
            />
            <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-800">
                Part {chunkIndex + 1}
                <span className="ml-1.5 font-normal tabular-nums text-slate-400">
                  {offsetLabel(chunks, chunkIndex)}
                </span>
              </span>
              {chunk.time && (
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatDateTime(new Date(chunk.time).toISOString())}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Suspicious activity — the session's AI moderation report.
 * The report analyses the same video chunks: each result carries a
 * moderation verdict plus per-frame scores (faces / objects / reasons).
 * ------------------------------------------------------------------ */

type FrameScore = {
  frame: string;
  score: number;
  reasons: string[];
  faceCount: number;
  suspicious: boolean;
  // The frame image's object key exactly as returned by the report
  // ("suspicious-activity/10/1786344839688/frame-8.jpg"); posted as-is to get a
  // presigned URL.
  objectKey: string | null;
};

type AiChunk = {
  id: string;
  time: number | null;
  status: string;
  suspicious: boolean;
  label: string | null;
  reason: string;
  score: number;
  frames: FrameScore[];
};

type AiReport = {
  suspicious: boolean;
  jobCount: number;
  suspiciousCount: number;
  labelCounts: Record<string, number>;
  chunks: AiChunk[];
  raw: any;
};

// Turn a moderation label / reason code into a human phrase.
function humanizeLabel(label: string): string {
  return label
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// The trailing numeric segment of an objectKey / messageId is the epoch-ms
// capture time (e.g. "sessions/9/1785993572299", "9-1785993572299").
function timeFromKey(key: string): number | null {
  const token = String(key).split(/[/\-]/).filter(Boolean).pop() ?? "";
  const value = Number(token);
  return Number.isFinite(value) && token.length >= 10 ? value : null;
}

function extractAiReport(data: any): AiReport {
  const root = data?.data ?? data ?? {};
  const results = Array.isArray(root?.results) ? root.results : [];

  const chunks: AiChunk[] = results
    .map((item: any, index: number): AiChunk => {
      const moderation = item?.moderation ?? {};
      const frames: FrameScore[] = (
        Array.isArray(moderation?.frameScores) ? moderation.frameScores : []
      ).map((frame: any, frameIndex: number) => ({
        frame: frame?.frame ?? `frame-${frameIndex + 1}`,
        score: Number(frame?.score ?? 0),
        reasons: Array.isArray(frame?.reasons) ? frame.reasons : [],
        faceCount: Number(frame?.faceCount ?? 0),
        suspicious: Boolean(frame?.suspicious),
        objectKey: frame?.objectKey ? String(frame.objectKey) : null,
      }));

      return {
        id: item?.messageId ?? item?.objectKey ?? String(index),
        time: timeFromKey(item?.objectKey ?? item?.messageId ?? ""),
        status: String(item?.status ?? "").toUpperCase(),
        suspicious: Boolean(
          moderation?.suspicious ?? item?.status === "SUSPICIOUS"
        ),
        label: moderation?.label ?? null,
        reason: moderation?.reason ?? item?.reason ?? "",
        score: Number(moderation?.score ?? 0),
        frames,
      };
    })
    .sort((a: AiChunk, b: AiChunk) => (a.time ?? 0) - (b.time ?? 0));

  const labelCounts: Record<string, number> = {};
  chunks.forEach((chunk) => {
    if (!chunk.suspicious) return;
    // Prefer the chunk label; otherwise fall back to the union of frame reasons.
    const labels = chunk.label
      ? [chunk.label]
      : Array.from(new Set(chunk.frames.flatMap((frame) => frame.reasons)));
    labels.forEach((label) => {
      labelCounts[label] = (labelCounts[label] ?? 0) + 1;
    });
  });

  return {
    suspicious:
      Boolean(root?.suspicious) || chunks.some((chunk) => chunk.suspicious),
    jobCount: Number(root?.jobCount ?? chunks.length),
    suspiciousCount: chunks.filter((chunk) => chunk.suspicious).length,
    labelCounts,
    chunks,
    raw: root,
  };
}

// The presigned-URL endpoint returns URLs for the object_keys we posted. The
// response shape isn't fixed, so accept an ordered `urls` array, an array of
// {object_key,url} objects, or a plain key→url map.
function mapPresignedUrls(
  keys: string[],
  data: any
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!data) return out;

  const list =
    (Array.isArray(data) && data) ||
    data.urls ||
    data.data?.urls ||
    data.presigned_urls ||
    data.presignedUrls ||
    null;

  if (Array.isArray(list)) {
    list.forEach((entry: any, index: number) => {
      const url =
        typeof entry === "string"
          ? entry
          : entry?.url ??
            entry?.URL ??
            entry?.signed_url ??
            entry?.presigned_url ??
            "";
      const key =
        (typeof entry === "object" &&
          (entry?.object_key ?? entry?.objectKey ?? entry?.key)) ||
        keys[index];
      if (key && url) out[key] = url;
    });
    return out;
  }

  // key → url (or url[]) map, possibly nested under `data`.
  const map = data.data ?? data;
  if (map && typeof map === "object") {
    keys.forEach((key) => {
      const value = map[key];
      if (typeof value === "string") {
        out[key] = value;
      } else if (Array.isArray(value)) {
        out[key] = value.filter((item): item is string => typeof item === "string");
      }
    });
  }
  return out;
}

// The flagged frame images for one chunk, resolved from each frame's own
// presigned URL.
function SuspiciousFrames({
  frames,
  urls,
  loading,
}: {
  frames: FrameScore[];
  urls: Record<string, string | string[]>;
  loading: boolean;
}) {
  const flagged = frames.filter((frame) => frame.suspicious && frame.objectKey);
  if (!flagged.length) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {flagged.map((frame, index) => {
        const raw = frame.objectKey ? urls[frame.objectKey] : undefined;
        const url = Array.isArray(raw) ? raw[0] : raw;
        return (
          <a
            key={`${frame.frame}-${index}`}
            href={url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-xl border border-rose-200 bg-slate-100"
            title={
              frame.reasons.length
                ? frame.reasons.map(humanizeLabel).join(", ")
                : frame.frame
            }
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={frame.frame}
                loading="lazy"
                className="aspect-video w-full object-cover transition group-hover:opacity-90"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-slate-200" />
                ) : (
                  <FiImage className="h-5 w-5 text-slate-400" />
                )}
              </div>
            )}
            {frame.reasons.length > 0 && (
              <span className="absolute bottom-1 left-1 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {frame.reasons.map(humanizeLabel).join(", ")}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

// Small colour-coded strip of the 10 sampled frames for one chunk.
function FrameStrip({ frames }: { frames: FrameScore[] }) {
  if (!frames.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {frames.map((frame, index) => (
        <span
          key={`${frame.frame}-${index}`}
          title={`${frame.frame} · faces: ${frame.faceCount}${
            frame.reasons.length ? ` · ${frame.reasons.join(", ")}` : " · clean"
          }`}
          className={`h-4 w-4 rounded-[4px] ${
            frame.suspicious ? "bg-rose-500" : "bg-emerald-400/70"
          }`}
        />
      ))}
    </div>
  );
}

function SuspiciousPanel({
  batchId,
  candidateId,
  sessionId,
}: {
  batchId: string;
  candidateId: string;
  sessionId: string | number;
}) {
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [frameUrls, setFrameUrls] = useState<
    Record<string, string | string[]>
  >({});
  const [framesLoading, setFramesLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOnlyFlagged(false);
    setFrameUrls({});
    api
      .get(
        `/batches/${batchId}/candidates/${candidateId}/sessions/${sessionId}/ai-report`,
        { signal: controller.signal }
      )
      .then((response) => {
        setReport(extractAiReport(response.data));
      })
      .catch((err: any) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError")
          return;
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "Failed to load the AI activity report for this session."
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [batchId, candidateId, sessionId]);

  // Once the report is in, fetch presigned URLs for every flagged frame,
  // posting each frame's object key exactly as it came from the report.
  useEffect(() => {
    if (!report) return;
    const keys = Array.from(
      new Set(
        report.chunks.flatMap((chunk) =>
          chunk.frames
            .filter((frame) => frame.suspicious && frame.objectKey)
            .map((frame) => frame.objectKey as string)
        )
      )
    );
    if (!keys.length) {
      setFrameUrls({});
      return;
    }

    const controller = new AbortController();
    setFramesLoading(true);
    api
      .post(
        `/batches/${batchId}/candidates/${candidateId}/sessions/${sessionId}/evidence-presigned-urls`,
        { object_keys: keys },
        { signal: controller.signal }
      )
      .then((response) => {
        setFrameUrls(mapPresignedUrls(keys, response.data));
      })
      .catch((err: any) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError")
          return;
        setFrameUrls({});
      })
      .finally(() => setFramesLoading(false));
    return () => controller.abort();
  }, [report, batchId, candidateId, sessionId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-20 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  if (!report) return null;

  if (!report.chunks.length) {
    return (
      <pre className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
        {JSON.stringify(report.raw, null, 2)}
      </pre>
    );
  }

  const labels = Object.entries(report.labelCounts).sort((a, b) => b[1] - a[1]);
  const visibleChunks = onlyFlagged
    ? report.chunks.filter((chunk) => chunk.suspicious)
    : report.chunks;

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
          report.suspicious
            ? "border-rose-200 bg-rose-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              report.suspicious
                ? "bg-rose-100 text-rose-600"
                : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {report.suspicious ? (
              <FiAlertTriangle className="h-5 w-5" />
            ) : (
              <FiActivity className="h-5 w-5" />
            )}
          </span>
          <div>
            <p
              className={`text-sm font-bold ${
                report.suspicious ? "text-rose-800" : "text-emerald-800"
              }`}
            >
              {report.suspicious
                ? "Suspicious activity detected"
                : "No suspicious activity"}
            </p>
            <p
              className={`mt-0.5 text-xs ${
                report.suspicious ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              {report.suspiciousCount} of {report.jobCount} analysed chunk
              {report.jobCount === 1 ? "" : "s"} flagged
            </p>
          </div>
        </div>

        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.map(([label, count]) => (
              <span
                key={label}
                className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700"
              >
                {humanizeLabel(label)} · {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chunk timeline */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600">
          Chunk-by-chunk analysis
        </p>
        {report.suspiciousCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(event) => setOnlyFlagged(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-rose-600"
            />
            Flagged only
          </label>
        )}
      </div>

      <ul className="space-y-3">
        {visibleChunks.map((chunk, index) => (
          <li
            key={chunk.id}
            className={`rounded-2xl border p-4 shadow-sm ${
              chunk.suspicious
                ? "border-rose-200 bg-rose-50/40"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    chunk.suspicious ? "bg-rose-500" : "bg-emerald-400"
                  }`}
                />
                <p className="text-sm font-semibold text-slate-900">
                  Part {index + 1}
                  {chunk.time && (
                    <span className="ml-2 text-[11px] font-normal text-slate-400">
                      {formatDateTime(new Date(chunk.time).toISOString())}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {chunk.suspicious && chunk.label && (
                  <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    {humanizeLabel(chunk.label)}
                  </span>
                )}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    chunk.suspicious
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {chunk.suspicious ? "Suspicious" : "Clear"}
                </span>
              </div>
            </div>

            {chunk.suspicious && chunk.reason && (
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {chunk.reason}
              </p>
            )}

            {chunk.frames.length > 0 && (
              <div className="mt-3">
                <FrameStrip frames={chunk.frames} />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {chunk.frames.filter((frame) => frame.suspicious).length}/
                  {chunk.frames.length} frames flagged
                </p>
              </div>
            )}

            {chunk.suspicious && (
              <SuspiciousFrames
                frames={chunk.frames}
                urls={frameUrls}
                loading={framesLoading}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page shell — session picker + tabs.
 * ------------------------------------------------------------------ */

function EvidencesInner() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const candidateId = String(params?.candidateId ?? "");
  const batchId = searchParams.get("batchId") ?? "";

  const { candidates, loading } = useAppSelector((state) => state.candidates);

  const [activeSessionId, setActiveSessionId] = useState<
    string | number | null
  >(null);
  const [tab, setTab] = useState<EvidenceTab>("recordings");

  useEffect(() => {
    if (batchId) {
      dispatch(fetchCandidates(batchId));
    }
  }, [dispatch, batchId]);

  const candidate = useMemo(
    () => candidates.find((item) => String(item.id) === candidateId),
    [candidates, candidateId]
  );

  const sessions: CandidateSession[] = useMemo(
    () => candidate?.sessions ?? [],
    [candidate]
  );

  useEffect(() => {
    if (sessions.length && activeSessionId === null) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col gap-6">
      <header className="glass-panel rounded-[2rem] border border-white/80 px-8 py-6 shadow-soft shadow-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                router.push(
                  batchId
                    ? `/batches/candidates?batchId=${batchId}`
                    : "/batches"
                )
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Evidences
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {candidate?.enrollment_no || `Candidate #${candidateId}`}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Batch #{batchId || "—"} · {sessions.length} session
                {sessions.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {loading && !candidate ? (
        <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : !candidate ? (
        <div className="glass-panel rounded-[2rem] border border-white/80 p-10 text-center shadow-soft">
          <FiAlertTriangle className="mx-auto mb-2 h-7 w-7 text-amber-500" />
          <h5 className="text-sm font-bold text-slate-950">
            Candidate not found
          </h5>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            We couldn&apos;t find this candidate in the batch. Go back and open
            evidences from the candidate list.
          </p>
        </div>
      ) : !sessions.length ? (
        <div className="glass-panel rounded-[2rem] border border-white/80 p-10 text-center shadow-soft">
          <FiVideo className="mx-auto mb-2 h-7 w-7 text-slate-400" />
          <h5 className="text-sm font-bold text-slate-950">No sessions yet</h5>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            This candidate hasn&apos;t started any test, so there is no evidence
            to review.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
          {/* Session picker */}
          <div className="flex flex-wrap gap-2.5">
            {sessions.map((session) => {
              const status = sessionStatusBadge(session.session_status);
              const isActive = session.id === activeSessionId;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-2.5 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-950 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {testTypeLabel(session.test_type)}
                    <span
                      className={`text-[10px] font-normal ${
                        isActive ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      #{session.id}
                    </span>
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isActive
                        ? "border-white/20 bg-white/10 text-white"
                        : status.badge
                    }`}
                  >
                    {status.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          {activeSessionId !== null && (
            <>
              <div className="mt-6 flex gap-1 border-b border-slate-150">
                <button
                  type="button"
                  onClick={() => setTab("recordings")}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    tab === "recordings"
                      ? "border-slate-900 text-slate-950"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <FiVideo className="h-4 w-4" />
                  Recordings
                </button>
                <button
                  type="button"
                  onClick={() => setTab("suspicious")}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    tab === "suspicious"
                      ? "border-slate-900 text-slate-950"
                      : "border-transparent text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <FiActivity className="h-4 w-4" />
                  Suspicious Activity
                </button>
              </div>

              <div className="mt-6">
                {tab === "recordings" ? (
                  <RecordingsPanel
                    key={`rec-${activeSessionId}`}
                    batchId={batchId}
                    candidateId={candidateId}
                    sessionId={activeSessionId}
                  />
                ) : (
                  <SuspiciousPanel
                    key={`ai-${activeSessionId}`}
                    batchId={batchId}
                    candidateId={candidateId}
                    sessionId={activeSessionId}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function CandidateEvidencesPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <EvidencesInner />
    </Suspense>
  );
}
