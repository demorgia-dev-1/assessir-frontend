"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  initializeAuth,
  logoutAdminAction
} from "@/store/slices/auth-slice";

const navigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M4 13.2c0-.64 0-.96.08-1.26a2 2 0 0 1 .43-.78c.21-.23.5-.4 1.06-.76l5.3-3.36c.5-.32.76-.48 1.05-.54a2 2 0 0 1 .76 0c.29.06.55.22 1.05.54l5.3 3.36c.56.36.85.53 1.06.76.2.22.35.48.43.78.08.3.08.62.08 1.26v4.04c0 1.12 0 1.68-.22 2.1a2 2 0 0 1-.88.88c-.42.22-.98.22-2.1.22H8.2c-1.12 0-1.68 0-2.1-.22a2 2 0 0 1-.88-.88c-.22-.42-.22-.98-.22-2.1z" />
      </svg>
    )
  },
  
  {
    href: "/sectors",
    label: "Sectors",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    )
  },
  {
    href: "/job-roles",
    label: "Job Roles",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    )
  },
  {
    href: "/users",
    label: "Users",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    )
  },
  {
    href: "/teams",
    label: "Teams",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
 
  {
    href: "/reports",
    label: "Reports",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M4 19.5V6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75V19.5" />
        <path d="M8 10h8M8 14h8M8 18h5" />
      </svg>
    )
  }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitialized, isLoading, session } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isInitialized, router]);

  const handleLogout = () => {
    dispatch(logoutAdminAction());
    router.replace("/");
  };

  if (!isInitialized || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel rounded-full border border-white/70 px-6 py-3 text-sm font-medium text-slate-700 shadow-soft">
          Preparing admin workspace...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1700px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="mesh-panel relative overflow-hidden rounded-[2rem] border border-slate-900/10 p-6 text-white shadow-soft">
          <div className="grid-overlay absolute inset-0 opacity-30" />
          <div className="relative z-10 flex h-full flex-col">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm shadow-slate-950/10">
                  <img
                    src="/logo.png"
                    alt="Asses-Sir Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
                    Asses-Sir
                  </p>
                  <h1 className="mt-1 text-xl font-semibold text-white">
                    Admin Console
                  </h1>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-1 flex-col gap-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-slate-950 shadow-lg shadow-slate-950/10"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                    href={item.href}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/30 p-5 backdrop-blur-sm">
              {/* <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                Session
              </p> */}
              <p className="mt-2 text-sm font-semibold text-white">
                {session?.role ?? "admin"}
              </p>
              {/* <p className="mt-2 text-sm text-slate-300">
                Cookie-based session active for Assessir operations.
              </p> */}
              <button
                className="mt-5 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/18"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-full flex-col gap-4">
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
