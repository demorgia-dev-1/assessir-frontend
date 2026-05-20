"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAuthError,
  initializeAuth,
  loginAdminAction,
} from "@/store/slices/auth-slice";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";

const trustSignals = [
  {
    title: "AI Proctoring",
    value: "24/7",
    detail: "Continuous monitoring for secure online assessments.",
  },
  {
    title: "Candidate Security",
    value: "100%",
    detail: "Advanced authentication and anti-cheating workflow.",
  },
  {
    title: "Instant Reports",
    value: "Real-Time",
    detail: "Live analytics and performance insights for exams.",
  },
];

export function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { error, isAuthenticated, isInitialized, isLoading } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      toast.success("Welcome back! Access granted successfully.");
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isInitialized, router]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      dispatch(clearAuthError());
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) {
      dispatch(clearAuthError());
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(loginAdminAction({ email, password }));
  };

  if (!isInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="rounded-full border border-white bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-xl">
          Preparing Assessir Admin...
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[420px] w-[420px] rounded-full bg-sky-200/40 blur-3xl" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT SIDE */}
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <img
              src="/logo.png"
              alt="Asses-Sir Logo"
              className="h-28 w-28 ml-8 object-contain mix-blend-multiply"
            />
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-700">
              Asses-Sir Admin
            </p>

            <h1 className="mt-6 text-6xl font-bold leading-[1.05] tracking-tight text-slate-900">
              Professional
              <span className="block text-sky-600">Exam Management</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Manage assessments, monitor candidate activity, and oversee
              examination workflows with a clean and secure admin platform.
            </p>
          </div>

          {/* CARDS */}
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {trustSignals.map((signal) => (
              <div
                key={signal.title}
                className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition hover:-translate-y-1"
              >
                <p className="text-sm font-medium text-slate-500">
                  {signal.title}
                </p>

                <h2 className="mt-4 text-4xl font-bold text-slate-900">
                  {signal.value}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {signal.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section>
          <div className="mx-auto w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
            {/* HEADER */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                  Secure Access
                </p>

                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h2>

                <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
                  Sign in to continue managing exams, assessors, and candidate
                  operations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Portal
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Admin
                </p>
              </div>
            </div>

            {/* FORM */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Work Email
                </label>

                <input
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  onChange={handleEmailChange}
                  placeholder="admin@assessir.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-300 bg-white pl-4 pr-12 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-900 transition"
                  >
                    {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                className="w-full rounded-2xl bg-sky-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Signing In..." : "Sign In to Dashboard"}
              </button>
            </form>

            {/* FOOTER */}
            <div className="mt-8 grid gap-3 rounded-3xl bg-slate-100 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Brand
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Asses-Sir
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Product
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Assessment
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Security
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  JWT Auth
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
