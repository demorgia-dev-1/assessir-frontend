"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FiActivity,
  FiArrowUpRight,
  FiBriefcase,
  FiGrid,
  FiHelpCircle,
  FiLayers,
  FiUsers,
} from "react-icons/fi";

import { useAppSelector } from "@/store/hooks";
import {
  BarChart,
  BarList,
  ChartLegend,
  DonutChart,
  ORDINAL_BLUE,
  SERIES_COLORS,
  STATUS_COLORS,
  TrendChart,
  formatNumber,
} from "@/components/charts";

/* ------------------------------------------------------------------ *
 * Static presentation data.
 *
 * There is no dashboard API yet — every figure below is placeholder
 * content so the layout can be reviewed. Swap these constants for real
 * responses when the endpoints exist; the components take the same shape.
 * ------------------------------------------------------------------ */

const TREND_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

const TREND_SERIES = [
  {
    key: "batches",
    label: "Batches",
    color: SERIES_COLORS.blue,
    values: [8, 12, 10, 18, 22, 26],
  },
  {
    key: "questions",
    label: "Questions",
    color: SERIES_COLORS.orange,
    values: [24, 31, 28, 44, 39, 52],
  },
  {
    key: "users",
    label: "Users",
    color: SERIES_COLORS.aqua,
    values: [6, 9, 14, 11, 19, 23],
  },
];

const BATCH_SPLIT = { published: 41, draft: 23 };

const TOTALS = {
  users: 248,
  batches: BATCH_SPLIT.published + BATCH_SPLIT.draft,
  ongoing: 12,
  paused: 3,
  completed: 27,
  questions: 1840,
  jobRoles: 36,
  sectors: 9,
  teams: 7,
};

const DIFFICULTY_DATA = [
  { key: "easy", label: "Easy", value: 742, color: ORDINAL_BLUE[0] },
  { key: "medium", label: "Medium", value: 806, color: ORDINAL_BLUE[1] },
  { key: "hard", label: "Hard", value: 292, color: ORDINAL_BLUE[2] },
];

const ROLE_DATA = [
  { key: "candidate", label: "Candidate", value: 176, color: SERIES_COLORS.blue },
  { key: "assessor", label: "Assessor", value: 54, color: SERIES_COLORS.orange },
  { key: "admin", label: "Admin", value: 18, color: SERIES_COLORS.aqua },
];

const LIVE_EXAMS = [
  { key: "b-114-theory", batch: "Solar Technician — Batch 114", test: "theory", status: "in_progress" },
  { key: "b-109-practical", batch: "Retail Associate — Batch 109", test: "practical", status: "in_progress" },
  { key: "b-121-viva", batch: "Field Technician — Batch 121", test: "viva", status: "paused" },
  { key: "b-098-theory", batch: "Data Entry Operator — Batch 98", test: "theory", status: "completed" },
  { key: "b-131-practical", batch: "CNC Operator — Batch 131", test: "practical", status: "not_initialized" },
];

const EXAM_STATUS_META: Record<string, { label: string; color: string; chip: string }> = {
  in_progress: {
    label: "In progress",
    color: STATUS_COLORS.good,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  paused: {
    label: "Paused",
    color: STATUS_COLORS.warning,
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
  disconnected: {
    label: "Disconnected",
    color: STATUS_COLORS.critical,
    chip: "border-rose-200 bg-rose-50 text-rose-700",
  },
  completed: {
    label: "Completed",
    color: SERIES_COLORS.blue,
    chip: "border-sky-200 bg-sky-50 text-sky-700",
  },
  not_initialized: {
    label: "Not started",
    color: STATUS_COLORS.neutral,
    chip: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

const KPIS = [
  {
    key: "users",
    label: "Total users",
    value: TOTALS.users,
    hint: ROLE_DATA.map((role) => `${role.label} ${role.value}`).join(" · "),
    icon: FiUsers,
    href: "/users",
    accent: SERIES_COLORS.blue,
  },
  {
    key: "batches",
    label: "Total assessments",
    value: TOTALS.batches,
    hint: `${BATCH_SPLIT.published} published · ${BATCH_SPLIT.draft} draft`,
    icon: FiLayers,
    href: "/batches",
    accent: SERIES_COLORS.orange,
  },
  {
    key: "ongoing",
    label: "Exams ongoing",
    value: TOTALS.ongoing,
    hint: `${TOTALS.paused} paused · ${TOTALS.completed} completed`,
    icon: FiActivity,
    href: "/batches",
    accent: STATUS_COLORS.good,
    live: true,
  },
  {
    key: "questions",
    label: "Question bank",
    value: TOTALS.questions,
    hint: DIFFICULTY_DATA.map((item) => `${item.label} ${item.value}`).join(" · "),
    icon: FiHelpCircle,
    href: "/questions",
    accent: SERIES_COLORS.aqua,
  },
  {
    key: "jobRoles",
    label: "Job roles",
    value: TOTALS.jobRoles,
    hint: `${TOTALS.sectors} sectors mapped`,
    icon: FiBriefcase,
    href: "/job-roles",
    accent: SERIES_COLORS.blue,
  },
  {
    key: "teams",
    label: "Teams",
    value: TOTALS.teams,
    hint: "Assessor & operations groups",
    icon: FiGrid,
    href: "/teams",
    accent: SERIES_COLORS.orange,
  },
];

export function DashboardScreen() {
  const { session } = useAppSelector((state) => state.auth);

  const greetingName = useMemo(() => {
    if (!session?.email) return "Admin";
    return session.email.split("@")[0].replace(/[._-]/g, " ");
  }, [session?.email]);

  return (
    <section className="flex flex-col gap-5">
      {/* ---------- Header ---------- */}
      <header className="fade-up glass-panel rounded-[2rem] border border-white/70 px-6 py-5 shadow-soft shadow-slate-900/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">
              Assessir Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Welcome back, {greetingName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Totals across users, assessments and the question bank, with live exam
              activity at a glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Signed in</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {session?.email ?? "admin@assessir.com"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-2.5 text-white shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Role</p>
              <p className="mt-0.5 text-sm font-semibold capitalize">{session?.role ?? "admin"}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- KPI tiles ---------- */}
      <div className="fade-up-delay grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.key}
              href={kpi.href}
              className="group glass-panel rounded-2xl border border-white/70 p-4 shadow-soft shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ background: `${kpi.accent}1a`, color: kpi.accent }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {kpi.live ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                ) : (
                  <FiArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                )}
              </div>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {kpi.label}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-950">
                {formatNumber(kpi.value)}
              </p>
              <p className="mt-2 truncate text-xs text-slate-500" title={kpi.hint}>
                {kpi.hint}
              </p>
            </Link>
          );
        })}
      </div>

      {/* ---------- Trend + batch readiness ---------- */}
      <div className="fade-up-delay-2 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <article className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Platform growth</h2>
              <p className="mt-1 text-sm text-slate-500">
                Records created per month · last {TREND_MONTHS.length} months
              </p>
            </div>
            <ChartLegend
              items={TREND_SERIES.map((item) => ({
                key: item.key,
                label: item.label,
                color: item.color,
                value: item.values.reduce((sum, value) => sum + value, 0),
              }))}
            />
          </div>

          <div className="mt-4">
            <TrendChart labels={TREND_MONTHS} series={TREND_SERIES} />
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
          <h2 className="text-lg font-semibold text-slate-950">Assessment readiness</h2>
          <p className="mt-1 text-sm text-slate-500">Published vs draft batches</p>

          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-around xl:flex-col">
            <DonutChart
              slices={[
                {
                  key: "published",
                  label: "Published",
                  value: BATCH_SPLIT.published,
                  color: SERIES_COLORS.blue,
                },
                {
                  key: "draft",
                  label: "Draft",
                  value: BATCH_SPLIT.draft,
                  color: SERIES_COLORS.orange,
                },
              ]}
              centerValue={formatNumber(TOTALS.batches)}
              centerLabel="Total batches"
            />

            <ul className="w-full space-y-3 sm:w-auto xl:w-full">
              <li className="flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: SERIES_COLORS.blue }}
                  />
                  Published
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-950">
                  {BATCH_SPLIT.published}
                </span>
              </li>
              <li className="flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: SERIES_COLORS.orange }}
                  />
                  Draft
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-950">
                  {BATCH_SPLIT.draft}
                </span>
              </li>
            </ul>
          </div>
        </article>
      </div>

      {/* ---------- Question mix / users / live monitor ---------- */}
      <div className="fade-up-delay-2 grid gap-5 xl:grid-cols-3">
        <article className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
          <h2 className="text-lg font-semibold text-slate-950">Question difficulty</h2>
          <p className="mt-1 text-sm text-slate-500">
            Across {formatNumber(TOTALS.questions)} questions
          </p>
          <div className="mt-3">
            <BarChart data={DIFFICULTY_DATA} />
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
          <h2 className="text-lg font-semibold text-slate-950">Users by role</h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(TOTALS.users)} accounts in total
          </p>
          <div className="mt-5">
            <BarList data={ROLE_DATA} />
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Live exam monitor</h2>
              <p className="mt-1 text-sm text-slate-500">Recent published batches</p>
            </div>
            <Link
              href="/batches"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Manage
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {LIVE_EXAMS.map((exam) => {
              const meta = EXAM_STATUS_META[exam.status];
              return (
                <div
                  key={exam.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{exam.batch}</p>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">{exam.test} test</p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
