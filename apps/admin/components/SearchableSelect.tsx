"use client";

/**
 * A select with a built-in search box — a lightweight combobox for long lists
 * (sectors / job roles / batches). Keyboard: type to filter, Esc to close.
 * The "all / none" choice is just an option with an empty value passed by the
 * caller, so the trigger shows its label instead of the placeholder.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";

export type SelectOption = { value: string; label: string };

const TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-60";

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
  triggerClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reset the query and focus the search box each time it opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName ?? TRIGGER_CLASS}
      >
        <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="relative border-b border-slate-100 p-2">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto p-1">
            {filtered.length ? (
              filtered.map((option) => {
                const isActive = option.value === value;
                return (
                  <li key={option.value || "__all__"}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-slate-950 font-semibold text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center text-xs text-slate-400">
                No matches
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
