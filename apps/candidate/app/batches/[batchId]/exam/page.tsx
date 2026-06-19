"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiBookOpen,
  FiClock,
  FiCode,
  FiLogOut,
  FiMic,
  FiShield,
  FiArrowRight,
  FiLayers,
  FiHash,
  FiArrowLeft,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutCandidateAction } from "@/store/slices/auth-slice";
import { decryptData, encryptData } from "@/lib/crypto";
import api from "@/lib/api";

/* ── Types ──────────────────────────────────────────── */
interface TestSection {
  id: number;
  question_ids: number[];
}

interface TestData {
  id: number;
  time_in_minutes: number;
  sections: TestSection[];
}

interface BatchData {
  id: number;
  name: string;
  theory_test: TestData | null;
  practical_test: TestData | null;
  viva_test: TestData | null;
}

/* ── Test card config ───────────────────────────────── */
const TEST_CARDS: {
  key: "theory_test" | "practical_test" | "viva_test";
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "theory_test",
    label: "Theory Test",
    icon: <FiBookOpen className="h-5 w-5" />,
  },
  {
    key: "practical_test",
    label: "Practical Test",
    icon: <FiCode className="h-5 w-5" />,
  },
  {
    key: "viva_test",
    label: "Viva Test",
    icon: <FiMic className="h-5 w-5" />,
  },
];

/* ── Inner component (needs useSearchParams inside Suspense) ── */
function ExamDashboardInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = params.batchId as string;
  const dispatch = useAppDispatch();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { isAuthenticated, isInitialized, session } = useAppSelector(
    (state) => state.auth
  );

  // Decrypt batch data from URL param
  const batch = useMemo<BatchData | null>(() => {
    const encrypted = searchParams.get("data");
    if (!encrypted) return null;
    return decryptData<BatchData>(encrypted);
  }, [searchParams]);

  // View state management
  const [view, setView] = useState<"dashboard" | "instructions" | "countdown">("dashboard");
  const [selectedTest, setSelectedTest] = useState<{
    key: "theory_test" | "practical_test" | "viva_test";
    label: string;
  } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [isStartingApi, setIsStartingApi] = useState(false);

  // Auth guard
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(`/batches/${batchId}/exam/login`);
    }
  }, [isInitialized, isAuthenticated, batchId, router]);

  // No data guard
  useEffect(() => {
    if (isInitialized && isAuthenticated && !batch) {
      toast.error("Invalid exam data. Please log in again.");
      router.replace(`/batches/${batchId}/exam/login`);
    }
  }, [isInitialized, isAuthenticated, batch, batchId, router]);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === "countdown" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (view === "countdown" && countdown === 0) {
      triggerStartTest();
    }
    return () => clearTimeout(timer);
  }, [view, countdown]);

  const handleLogout = () => {
    dispatch(logoutCandidateAction());
    router.replace(`/batches/${batchId}/exam/login`);
  };

  const handleStartTestClick = (key: "theory_test" | "practical_test" | "viva_test", label: string) => {
    setSelectedTest({ key, label });
    setConsentChecked(false);
    setView("instructions");
  };

  const triggerStartTest = async () => {
    if (!selectedTest) return;
    setIsStartingApi(true);
    const testType = selectedTest.key.replace("_test", ""); // theory, practical, viva

    try {
      await api.post(`/batches/${batchId}/exam/start?testType=${testType}`);
      toast.success(`${selectedTest.label} started successfully!`);

      const testData = batch![selectedTest.key];
      const encryptedTestData = encryptData({
        testId: testData!.id,
        sections: testData!.sections,
        timeInMinutes: testData!.time_in_minutes,
      });
      router.push(`/batches/${batchId}/exam/test?type=${testType}&data=${encryptedTestData}`);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || error.response?.data?.message || "Failed to start the test. Please try again.";
      toast.error(errMsg);
      setView("instructions");
    } finally {
      setIsStartingApi(false);
    }
  };

  // Compute summary stats
  const totalTime = useMemo(() => {
    if (!batch) return 0;
    return (
      (batch.theory_test?.time_in_minutes ?? 0) +
      (batch.practical_test?.time_in_minutes ?? 0) +
      (batch.viva_test?.time_in_minutes ?? 0)
    );
  }, [batch]);

  const totalQuestions = useMemo(() => {
    if (!batch) return 0;
    const count = (test: TestData | null) =>
      test?.sections?.reduce((sum, s) => sum + (s.question_ids?.length ?? 0), 0) ?? 0;
    return count(batch.theory_test) + count(batch.practical_test) + count(batch.viva_test);
  }, [batch]);

  const totalSections = useMemo(() => {
    if (!batch) return 0;
    const count = (test: TestData | null) => test?.sections?.length ?? 0;
    return count(batch.theory_test) + count(batch.practical_test) + count(batch.viva_test);
  }, [batch]);

  // Loading state
  if (!mounted || !isInitialized || !batch) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-xl">
          Preparing your exam…
        </div>
      </main>
    );
  }

  // Active test configurations
  const activeTest = selectedTest ? batch[selectedTest.key] : null;
  const activeQuestionCount = activeTest
    ? activeTest.sections?.reduce((sum, s) => sum + (s.question_ids?.length ?? 0), 0) ?? 0
    : 0;

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-white">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="border-b border-blue-100/60 bg-white/80 px-6 py-4 backdrop-blur-sm sm:px-10">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-100">
                <img
                  src="/logo.png"
                  alt="Asses-Sir Logo"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-800">
                Asses-Sir
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-blue-100 bg-blue-50/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600 sm:block">
                Candidate Portal
              </div>
              {view === "dashboard" && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  type="button"
                >
                  <FiLogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Main content ────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-8 sm:px-10">

          {/* ── VIEW: Dashboard ─────────────────────────────── */}
          {view === "dashboard" && (
            <>
              {/* Batch title section */}
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                  Batch #{batch.id}
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {batch.name}
                </h1>
                {session?.enrollment_no && (
                  <p className="mt-2 text-sm text-slate-500">
                    Enrollment: <span className="font-semibold text-slate-700">{session.enrollment_no}</span>
                  </p>
                )}
              </div>

              {/* Summary stats */}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-4 rounded-2xl border border-blue-100/80 bg-white px-5 py-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FiClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{totalTime}</p>
                    <p className="text-xs font-medium text-slate-500">Total Minutes</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-blue-100/80 bg-white px-5 py-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FiHash className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{totalQuestions}</p>
                    <p className="text-xs font-medium text-slate-500">Total Questions</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-blue-100/80 bg-white px-5 py-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FiLayers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{totalSections}</p>
                    <p className="text-xs font-medium text-slate-500">Total Sections</p>
                  </div>
                </div>
              </div>

              {/* Test cards */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {TEST_CARDS.map((card) => {
                  const test = batch[card.key];
                  if (!test) return null;

                  const questionCount = test.sections?.reduce(
                    (sum: number, s: TestSection) => sum + (s.question_ids?.length ?? 0),
                    0
                  ) ?? 0;

                  return (
                    <div
                      key={card.key}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-blue-100/80 bg-white shadow-sm transition hover:shadow-md hover:border-blue-200"
                    >
                      {/* Card header */}
                      <div className="border-b border-blue-50 bg-blue-50/40 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                            {card.icon}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{card.label}</h3>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="flex flex-1 flex-col px-6 py-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Duration</span>
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                              <FiClock className="h-3.5 w-3.5 text-blue-400" />
                              {test.time_in_minutes} min
                            </span>
                          </div>

                          <div className="h-px bg-slate-100" />

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Questions</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {questionCount}
                            </span>
                          </div>

                          <div className="h-px bg-slate-100" />

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Sections</span>
                            <span className="text-sm font-semibold text-slate-900">
                              {test.sections?.length ?? 0}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartTestClick(card.key, card.label)}
                          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                          type="button"
                        >
                          Start Test
                          <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── VIEW: Instructions ──────────────────────────── */}
          {view === "instructions" && selectedTest && activeTest && (
            <div className="mx-auto max-w-3xl">
              <button
                onClick={() => setView("dashboard")}
                className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>

              <div className="rounded-2xl border border-blue-100/80 bg-white p-6 shadow-sm sm:p-10">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
                      Step 1 of 2 · Exam Guidelines
                    </span>
                    <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                      {selectedTest.label} Instructions
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
                    <FiClock className="h-3.5 w-3.5 text-blue-400" />
                    <span>{activeTest.time_in_minutes} min</span>
                  </div>
                </div>

                {/* Test details row */}
                <div className="mb-8 grid grid-cols-3 gap-4 rounded-xl bg-blue-50/50 p-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{activeTest.sections?.length ?? 0}</p>
                  </div>
                  <div className="border-x border-blue-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{activeQuestionCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Marks</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{activeQuestionCount * 4}</p>
                  </div>
                </div>

                {/* Guidelines Checklist */}
                <div className="mb-8 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Important Rules
                  </h3>

                  <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FiCheck className="h-3 w-3" />
                      </div>
                      <span><strong>Browser Integrity:</strong> Do not refresh the page, switch tabs, or minimize the browser window. Tab switches are logged and may terminate your session.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FiCheck className="h-3 w-3" />
                      </div>
                      <span><strong>Proctoring:</strong> Ensure your webcam remains active and your face is visible in the frame at all times (if webcam proctoring is enabled).</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FiCheck className="h-3 w-3" />
                      </div>
                      <span><strong>Timer:</strong> Once you begin, the timer starts ticking and cannot be paused or reset. It will submit automatically when time runs out.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FiCheck className="h-3 w-3" />
                      </div>
                      <span><strong>Stable Connection:</strong> Ensure your internet connection remains stable. Do not log out or disconnect.</span>
                    </li>
                  </ul>
                </div>

                {/* Consent checkbox */}
                <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
                  <label htmlFor="consent" className="flex cursor-pointer gap-3.5">
                    <input
                      id="consent"
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                      <strong className="text-slate-800">Candidate Declaration & Consent:</strong> I declare that I am the registered candidate and will complete this exam on my own without using helper books, chats, search engines, or AI tools. I consent to automatic activity logging and webcam proctoring monitoring.
                    </div>
                  </label>
                </div>

                {/* Action button */}
                <button
                  disabled={!consentChecked}
                  onClick={() => {
                    setCountdown(30);
                    setView("countdown");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Proceed to Start
                  <FiArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── VIEW: Countdown ─────────────────────────────── */}
          {view === "countdown" && selectedTest && (
            <div className="mx-auto max-w-xl text-center">
              <div className="rounded-2xl border border-blue-100/80 bg-white p-8 shadow-sm sm:p-12">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                  Step 2 of 2 · System Check
                </span>

                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Preparing Secure Workspace
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  The {selectedTest.label} will begin automatically when the timer reaches zero.
                </p>

                {/* Countdown circle */}
                <div className="relative mx-auto my-10 flex h-40 w-40 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
                  <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200/40">
                    <span className="text-5xl font-bold tabular-nums">
                      {countdown}
                    </span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">
                      seconds
                    </span>
                  </div>
                </div>

                {/* Security Warning */}
                <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs leading-relaxed text-amber-800">
                  <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <strong>Proctoring Notice:</strong> Please adjust your seat. Sit upright and make sure your face is clearly lit. Ensure your browser is in fullscreen. Closing this window or switching tabs will cancel the exam start.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    disabled={isStartingApi}
                    onClick={triggerStartTest}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-75"
                  >
                    {isStartingApi ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Launching Secure Exam…
                      </span>
                    ) : (
                      <>
                        Start Immediately
                        <FiArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    disabled={isStartingApi}
                    onClick={() => {
                      setView("instructions");
                      setCountdown(30);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel & Go Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Security footer ───────────────────────────── */}
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
            <FiShield className="h-3.5 w-3.5" />
            <span>
              Your session is encrypted and monitored. Do not share your screen or credentials.
            </span>
          </div>
        </div>
      </main>
    </>
  );
}

/* ── Page wrapper with Suspense for useSearchParams ── */
export default function ExamDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-xl">
            Loading exam details…
          </div>
        </main>
      }
    >
      <ExamDashboardInner />
    </Suspense>
  );
}
