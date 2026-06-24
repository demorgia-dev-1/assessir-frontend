"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiEye,
  FiEyeOff,
  FiShield,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginCandidateAction } from "@/store/slices/auth-slice";
import { encryptData } from "@/lib/crypto";

export default function CandidateLoginPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const dispatch = useAppDispatch();

  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { isLoading } = useAppSelector((state) => state.auth);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const resultAction = await dispatch(
        loginCandidateAction({
          batchId,
          enrollment_no: enrollmentNo,
          password,
        })
      );

      if (loginCandidateAction.fulfilled.match(resultAction)) {
        toast.success("Login successful! Preparing your exam…");
        const fullData = {
          ...resultAction.payload.batch,
          ...resultAction.payload.examMeta,
        };
        sessionStorage.setItem("candidate_exam_data", JSON.stringify(fullData));
        const encrypted = encryptData(fullData);
        router.replace(`/batches/${batchId}/exam?data=${encrypted}`);
      } else {
        const errorMsg =
          resultAction.payload ||
          "Login failed. Please check your credentials.";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <main className="relative flex min-h-screen flex-col overflow-hidden">
        {/* ── Animated background ─────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full bg-indigo-300/30 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-violet-300/30 blur-[100px] animate-pulse [animation-delay:1.5s]" />
          <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-sky-200/20 blur-[80px]" />

          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        {/* ── Top bar ────────────────────────────────────── */}
        <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md shadow-indigo-200/40 ring-1 ring-indigo-100">
              <img
                src="/logo.png"
                alt="Asses-Sir Logo"
                className="h-7 w-7 object-contain"
              />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-800">
              Asses-Sir
            </span>
          </div>

          <div className="rounded-full border border-indigo-100 bg-indigo-50/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 backdrop-blur-sm">
            Candidate Portal
          </div>
        </header>

        {/* ── Main content ───────────────────────────────── */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-8 sm:px-10 lg:gap-20">
          {/* Left – Hero text (hidden on mobile) */}
          <div className="hidden flex-1 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-indigo-500">
              Batch #{batchId}
            </p>

            <h1 className="mt-5 text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900">
              Your Exam
              <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Awaits You
              </span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-500">
              Enter your enrollment credentials to access your secure
              assessment. Stay focused — your performance matters.
            </p>

            {/* Info pills */}
            <div className="mt-10 flex flex-col gap-4">
              <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-lg shadow-indigo-100/30 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <FiShield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Secure Environment
                  </p>
                  <p className="text-xs text-slate-500">
                    AI-powered proctoring ensures exam integrity
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-lg shadow-indigo-100/30 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <FiClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Timed Assessment
                  </p>
                  <p className="text-xs text-slate-500">
                    Timer starts once you begin — manage your time wisely
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-lg shadow-indigo-100/30 backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <FiCheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Instant Results
                  </p>
                  <p className="text-xs text-slate-500">
                    Get your score immediately after submission
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right – Login card */}
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-2xl shadow-indigo-200/25 backdrop-blur-xl sm:p-10">
              {/* Card header */}
              <div className="mb-8">
                {/* Logo on mobile */}
                <div className="mb-5 flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow ring-1 ring-indigo-100">
                    <img
                      src="/logo.png"
                      alt="Asses-Sir Logo"
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Asses-Sir
                  </span>
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-600">
                  Exam Access
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                  Candidate Login
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Enter the credentials provided to you to start your exam.
                </p>
              </div>

              {/* Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Enrollment Number
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    onChange={(e) => setEnrollmentNo(e.target.value)}
                    placeholder="e.g. ENR001"
                    required
                    type="text"
                    value={enrollmentNo}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-4 pr-12 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-5 w-5" />
                      ) : (
                        <FiEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-300/40 transition hover:shadow-xl hover:shadow-indigo-300/50 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Verifying…
                    </span>
                  ) : (
                    "Start Exam →"
                  )}
                </button>
              </form>

              {/* Footer info */}
              <div className="mt-8 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FiShield className="h-3.5 w-3.5 text-indigo-400" />
                  <span>
                    Your session is encrypted and monitored. Do not share your
                    credentials.
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Asses-Sir · Secure Assessment
              Platform
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
