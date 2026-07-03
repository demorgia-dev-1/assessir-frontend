"use client";

import { ReactNode } from "react";

type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  /** Tooltip placement relative to the trigger. Defaults to "top". */
  side?: "top" | "bottom";
  className?: string;
};

/**
 * Lightweight CSS-only tooltip. Wraps an interactive element (button/link)
 * and reveals a styled label on hover/focus. No portal, no JS state.
 */
export default function Tooltip({
  label,
  children,
  side = "top",
  className = "",
}: TooltipProps) {
  const sideClasses =
    side === "top"
      ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
      : "top-full left-1/2 mt-2 -translate-x-1/2";

  return (
    <span className={`group/tooltip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 ${sideClasses} hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg group-hover/tooltip:block`}
      >
        {label}
      </span>
    </span>
  );
}
