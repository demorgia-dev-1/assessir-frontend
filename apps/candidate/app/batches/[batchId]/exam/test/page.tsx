"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiBookmark,
  FiRefreshCw,
  FiShield,
  FiCheck,
  FiAlertTriangle,
  FiBookOpen,
  FiAward,
} from "react-icons/fi";
import { useAppSelector } from "@/store/hooks";
import api from "@/lib/api";

/* ── Mock Questions Data ─────────────────────────────── */
interface MockQuestion {
  id: number;
  text: string;
  options?: string[];
  marks: number;
}

const MOCK_QUESTIONS: Record<string, MockQuestion[]> = {
  theory: [
    {
      id: 1,
      text: "Which of the following describes a key characteristic of RESTful APIs?",
      options: [
        "Session state is kept entirely on the server memory",
        "Requests must always use XML formats for payloads",
        "Operations are stateless and utilize standard HTTP methods",
        "Connections are kept open persistently using raw WebSockets",
      ],
      marks: 4,
    },
    {
      id: 2,
      text: "What is the primary purpose of the Virtual DOM in modern UI libraries like React?",
      options: [
        "To directly write raw HTML commands to bypass the rendering stack",
        "To compute minimal changes before batching updates to the real DOM",
        "To eliminate layout reflow and paint steps of browser renders completely",
        "To handle session token storage and auth cookies securely in a sandbox",
      ],
      marks: 4,
    },
    {
      id: 3,
      text: "Which CSS layout technique is explicitly designed for multi-directional control (rows and columns simultaneously)?",
      options: [
        "Flexbox layout system",
        "CSS Grid layout system",
        "Absolute positioning offsets",
        "Float-based inline wrappers",
      ],
      marks: 4,
    },
    {
      id: 4,
      text: "What does the Single Responsibility Principle (SRP) imply in software design?",
      options: [
        "A class or function should have only one reason to change",
        "All application services must run on a single physical machine",
        "A software package must perform its tasks synchronously in one thread",
        "Each database entity should be stored in exactly one master table",
      ],
      marks: 4,
    },
    {
      id: 5,
      text: "Which index structure is typically chosen by SQL databases to optimize range-based query execution?",
      options: [
        "Hash-map table indices",
        "B-Tree / B+ Tree indices",
        "Inverted list bitmap indices",
        "Geospatial GiST structures",
      ],
      marks: 4,
    },
  ],
  practical: [
    {
      id: 1,
      text: "Implement a function `findDuplicates(arr)` that returns all duplicates in an array in O(N) time complexity.",
      marks: 10,
    },
    {
      id: 2,
      text: "Write a script to crawl pages up to depth 2, printing out all links found. Include robust error handling for HTTP 404/500.",
      marks: 15,
    },
  ],
  viva: [
    {
      id: 1,
      text: "Explain the difference between optimistic and pessimistic locking in databases. Provide scenarios where each is best suited.",
      marks: 10,
    },
    {
      id: 2,
      text: "Detail how WebSockets establish connection handshakes and transition from regular HTTP protocols.",
      marks: 10,
    },
  ],
};

function ExamTestInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = params.batchId as string;
  const testType = (searchParams.get("type") || "theory") as "theory" | "practical" | "viva";

  const { isAuthenticated, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  // Auth guard
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(`/batches/${batchId}/exam/login`);
    }
  }, [isInitialized, isAuthenticated, batchId, router]);

  // Questions Setup
  const questions = useMemo(() => MOCK_QUESTIONS[testType] || MOCK_QUESTIONS.theory, [testType]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Answers State: maps question ID to selected option index or string text response
  const [answers, setAnswers] = useState<Record<number, number | string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`answers_${batchId}_${testType}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {};
  });

  // Question Status: 'unvisited' | 'visited' | 'answered' | 'marked'
  const [statuses, setStatuses] = useState<Record<number, "unvisited" | "visited" | "answered" | "marked">>(() => {
    const initial: Record<number, any> = {};
    questions.forEach((q, idx) => {
      initial[q.id] = idx === 0 ? "visited" : "unvisited";
    });
    return initial;
  });

  // Save answers to localStorage to prevent data loss on reload
  useEffect(() => {
    localStorage.setItem(`answers_${batchId}_${testType}`, JSON.stringify(answers));
  }, [answers, batchId, testType]);

  // Timer State (derived from test duration, defaulted to 30 mins)
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true); // Auto submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulating Proctoring/Integrity: Alert on tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        toast.warning(
          "Proctoring Alert: Tab switch detected! Doing this again will automatically submit your exam.",
          { autoClose: 6000 }
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Submission States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmittingApi, setIsSubmittingApi] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (qId: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
    setStatuses((prev) => ({ ...prev, [qId]: "answered" }));
  };

  const handleTextResponse = (qId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
    setStatuses((prev) => ({
      ...prev,
      [qId]: text.trim() ? "answered" : "visited",
    }));
  };

  const handleClearResponse = (qId: number) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
    setStatuses((prev) => ({ ...prev, [qId]: "visited" }));
  };

  const handleMarkForReview = (qId: number) => {
    setStatuses((prev) => ({ ...prev, [qId]: "marked" }));
    handleNext();
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      const nextId = questions[currentIdx + 1].id;
      setStatuses((prev) => ({
        ...prev,
        [nextId]: prev[nextId] === "unvisited" ? "visited" : prev[nextId],
      }));
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleNavigateToIdx = (idx: number) => {
    const qId = questions[idx].id;
    setStatuses((prev) => ({
      ...prev,
      [qId]: prev[qId] === "unvisited" ? "visited" : prev[qId],
    }));
    setCurrentIdx(idx);
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    setIsSubmittingApi(true);
    setIsSubmitModalOpen(false);

    try {
      // API call to finish the test
      await api.post(`/batches/${batchId}/exam/end?testType=${testType}`);
      
      // Cleanup answers
      localStorage.removeItem(`answers_${batchId}_${testType}`);
      toast.success("Assessment submitted successfully!");
      setIsExamCompleted(true);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || error.response?.data?.message || "Failed to submit assessment.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingApi(false);
    }
  };

  // Stats calculation for review
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(statuses).filter((s) => s === "marked").length;
  const unansweredCount = questions.length - answeredCount;

  // Render Completed View
  if (isExamCompleted) {
    return (
      <main className="relative flex min-h-screen items-center justify-center p-6 overflow-hidden">
        {/* Animated background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full bg-emerald-200/30 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-teal-200/20 blur-[100px]" />
        </div>

        <div className="max-w-md w-full text-center rounded-[2.5rem] border border-white/80 bg-white/85 p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <FiAward className="h-9 w-9" />
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900">
            Exam Submitted!
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            Thank you for completing your {testType} assessment. Your exam status has been updated securely. You can now close this tab.
          </p>

          <button
            onClick={() => router.replace(`/batches/${batchId}/exam`)}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200/50 hover:bg-indigo-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const activeQuestion = questions[currentIdx];

  // Danger limits
  const isTimeLow = timeLeft < 5 * 60;
  const isTimeCritical = timeLeft < 60;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="min-h-screen flex flex-col bg-slate-50 relative">
        {/* Animated background lines */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        {/* ── Top Bar ──────────────────────────────────────── */}
        <header className="relative z-10 bg-white border-b border-slate-100 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 shadow ring-1 ring-slate-200">
              <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 capitalize">
                {testType} Assessment
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-slate-400">
                Batch #{batchId} · Secure Exam Portal
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            {/* Countdown Clock */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition duration-300 font-mono text-sm font-bold ${
              isTimeCritical
                ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                : isTimeLow
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <FiClock className={`h-4 w-4 ${isTimeCritical ? "animate-spin" : ""}`} />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-indigo-100 transition"
              type="button"
            >
              Submit Exam
            </button>
          </div>
        </header>

        {/* ── Dashboard Grid Layout ───────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
          
          {/* Main Question Viewport */}
          <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 flex flex-col justify-between">
            <div className="max-w-3xl w-full mx-auto">
              
              {/* Question Weight Details */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                  Weight: {activeQuestion.marks} Marks
                </span>
              </div>

              {/* Question Text Box */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                  {activeQuestion.text}
                </h2>
              </div>

              {/* Option Selection (MCQ / Theory) */}
              {testType === "theory" && activeQuestion.options && (
                <div className="space-y-3">
                  {activeQuestion.options.map((optText, optIdx) => {
                    const isSelected = answers[activeQuestion.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(activeQuestion.id, optIdx)}
                        className={`w-full flex items-center justify-between border rounded-2xl p-4 text-left transition duration-200 group text-sm ${
                          isSelected
                            ? "bg-indigo-50/50 border-indigo-500 text-indigo-900 font-semibold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/70 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold transition duration-200 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-slate-50 text-slate-500 group-hover:border-slate-400"
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span>{optText}</span>
                        </div>
                        {isSelected && <FiCheck className="h-4 w-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Text Area Input (Practical / Viva) */}
              {(testType === "practical" || testType === "viva") && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <label className="block mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Your Response:
                  </label>
                  <textarea
                    className="w-full min-h-[200px] border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                    placeholder="Enter your detailed response here..."
                    value={(answers[activeQuestion.id] as string) || ""}
                    onChange={(e) => handleTextResponse(activeQuestion.id, e.target.value)}
                  />
                </div>
              )}

            </div>

            {/* Navigation Controls footer */}
            <div className="max-w-3xl w-full mx-auto mt-10 border-t border-slate-200/60 pt-6 flex flex-wrap gap-4 justify-between items-center pb-8">
              <div className="flex gap-2.5">
                <button
                  onClick={() => handleClearResponse(activeQuestion.id)}
                  className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-3 text-xs font-semibold shadow-sm transition"
                  type="button"
                >
                  Clear Response
                </button>

                <button
                  onClick={() => handleMarkForReview(activeQuestion.id)}
                  className="rounded-2xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/50 text-indigo-700 px-4 py-3 text-xs font-semibold shadow-sm transition"
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    <FiBookmark className="h-3.5 w-3.5" />
                    Mark for Review
                  </span>
                </button>
              </div>

              <div className="flex gap-2.5">
                <button
                  disabled={currentIdx === 0}
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 px-5 py-3 text-xs font-semibold shadow-sm transition"
                  type="button"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIdx === questions.length - 1}
                  className="flex items-center gap-1.5 rounded-2xl bg-slate-950 hover:bg-black text-white px-5 py-3 text-xs font-semibold shadow transition disabled:opacity-50"
                  type="button"
                >
                  Next
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </main>

          {/* Sidebar Navigation */}
          <aside className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-100 px-6 py-8 overflow-y-auto shadow-sm flex flex-col justify-between shrink-0">
            <div>
              {/* Sidebar Header */}
              <div className="mb-6 flex items-center gap-2 text-slate-800">
                <FiBookOpen className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-sm tracking-tight">Questions Navigator</h3>
              </div>

              {/* Grid of buttons */}
              <div className="grid grid-cols-5 gap-3.5 mb-8">
                {questions.map((q, idx) => {
                  const status = statuses[q.id];
                  const isCurrent = idx === currentIdx;
                  
                  let bgClass = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";
                  if (status === "answered") {
                    bgClass = "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100";
                  } else if (status === "marked") {
                    bgClass = "bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100";
                  } else if (status === "visited") {
                    bgClass = "bg-slate-200 border-slate-300 text-slate-800 hover:bg-slate-300";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleNavigateToIdx(idx)}
                      className={`h-11 w-full flex items-center justify-center rounded-xl border text-sm font-bold transition duration-200 ${bgClass} ${
                        isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Status Stats */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Assessment Summary
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="h-3 w-3 rounded-full bg-indigo-500" />
                  <span>Review ({markedCount})</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <div className="h-3 w-3 rounded-full bg-slate-200" />
                  <span>Unvisited ({unansweredCount})</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 p-3 text-[10px] text-indigo-700">
                <FiShield className="h-4 w-4 shrink-0 text-indigo-500" />
                <span>AI Proctoring is actively monitoring your browser activity.</span>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Submission Confirmation Modal ──────────────── */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
                <FiAlertTriangle className="h-6 w-6" />
              </div>

              <h3 className="text-xl font-bold text-slate-900">
                End Assessment?
              </h3>
              
              <p className="mt-2 text-xs text-slate-500">
                Review your stats below. Once submitted, you cannot edit your answers or resume the test.
              </p>

              {/* Stats table */}
              <div className="my-6 grid grid-cols-3 gap-2 border border-slate-100 rounded-2xl p-4 bg-slate-50 text-center">
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Answered</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{answeredCount}</p>
                </div>
                <div className="border-x border-slate-200">
                  <p className="text-xs text-slate-400 font-semibold">Review</p>
                  <p className="mt-1 text-lg font-bold text-indigo-600">{markedCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Remaining</p>
                  <p className="mt-1 text-lg font-bold text-slate-600">{unansweredCount}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 py-3.5 text-xs font-semibold shadow-sm transition"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 text-xs font-bold shadow-md shadow-indigo-100 transition"
                  type="button"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ExamTestPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6 bg-slate-50">
          <div className="rounded-full border border-white/70 bg-white/80 px-6 py-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-xl animate-pulse">
            Loading assessment details…
          </div>
        </main>
      }
    >
      <ExamTestInner />
    </Suspense>
  );
}
