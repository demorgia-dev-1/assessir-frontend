"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";

const priorityCards = [
  {
    title: "Assessments in progress",
    value: "128",
    delta: "+12 today",
    tone: "from-sky-500/20 to-sky-500/5"
  },
  {
    title: "Pending evaluator reviews",
    value: "36",
    delta: "8 urgent",
    tone: "from-amber-500/20 to-amber-500/5"
  },
  {
    title: "Candidate completion rate",
    value: "94%",
    delta: "+3.2% vs last week",
    tone: "from-emerald-500/20 to-emerald-500/5"
  }
];

const recentActivity = [
  {
    title: "Java backend assessment published",
    time: "5 min ago",
    status: "Released"
  },
  {
    title: "32 new candidate submissions received",
    time: "18 min ago",
    status: "In review"
  },
  {
    title: "Assessor calibration meeting completed",
    time: "42 min ago",
    status: "Completed"
  }
];

const workflowPanels = [
  {
    label: "Candidate Ops",
    detail: "Queue candidates, verify attendance, and monitor drop-off patterns."
  },
  {
    label: "Assessment Integrity",
    detail: "Track timing anomalies, suspicious behavior alerts, and audit flags."
  },
  {
    label: "Reporting",
    detail: "Share reliable scorecards and operational summaries with hiring teams."
  }
];

export function DashboardScreen() {
  const { session } = useAppSelector((state) => state.auth);

  const greetingName = useMemo(() => {
    if (!session?.email) {
      return "Admin";
    }

    return session.email.split("@")[0].replace(/[._-]/g, " ");
  }, [session?.email]);

  return (
    <section className="flex flex-col gap-6">
        <header className="fade-up glass-panel rounded-[2rem] border border-white/70 px-6 py-5 shadow-soft shadow-slate-900/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">
                Assessir Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Welcome back, {greetingName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Coordinate assessments, watch live activity, and keep every
                exam window running with professional precision.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Session
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {session?.role ?? "admin"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  Workspace
                </p>
                <p className="mt-1 text-sm font-semibold">Live control</p>
              </div>
            </div>
          </div>
        </header>

        <section className="fade-up-delay grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="mesh-panel relative overflow-hidden rounded-[2rem] p-7 text-white shadow-soft">
            <div className="grid-overlay absolute inset-0 opacity-35" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
                    Live Oversight
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold">
                    Assessment operations are stable and on schedule.
                  </h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    Active admins
                  </p>
                  <p className="mt-2 text-2xl font-semibold">12</p>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200/90">
                Candidate traffic is evenly distributed, assessor queue health is
                green, and no critical incidents are currently blocking exam delivery.
              </p>
            </div>
            <div className="absolute -bottom-10 right-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl" />
          </div>

          <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/10">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Signed in as
            </p>
            <p className="mt-4 text-xl font-semibold text-slate-950">
              {session?.email ?? "admin@assessir.com"}
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Role
                </p>
                <p className="mt-2 text-lg font-semibold">{session?.role ?? "admin"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Session status
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  Authenticated
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Cookie-based session is active for secured requests.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="fade-up-delay-2 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-3">
              {priorityCards.map((card) => (
                <article
                  key={card.title}
                  className="glass-panel rounded-[1.75rem] border border-white/70 p-5 shadow-soft shadow-slate-900/5"
                >
                  <div
                    className={`mb-5 h-2 rounded-full bg-gradient-to-r ${card.tone}`}
                  />
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {card.delta}
                  </p>
                </article>
              ))}
            </div>

            <div className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Workflow Areas
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                    Built for exam operations teams
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {workflowPanels.map((panel) => (
                  <article
                    key={panel.label}
                    className="rounded-3xl border border-slate-200 bg-white/80 p-5"
                  >
                    <p className="text-base font-semibold text-slate-900">
                      {panel.label}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {panel.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <aside className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft shadow-slate-900/5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Recent Activity
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Operational timeline
            </h2>

            <div className="mt-6 space-y-4">
              {recentActivity.map((item) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-white/80 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{item.time}</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {item.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
    </section>
  );
}
