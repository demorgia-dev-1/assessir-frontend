"use client";

/**
 * A select with a built-in search box — a lightweight combobox for long lists
 * (sectors / job roles / batches). Keyboard: type to filter, Esc to close.
 *
 * The menu is rendered in a portal with fixed positioning so it is never
 * clipped by an `overflow-hidden` / scrolling ancestor and always paints above
 * sibling panels. The "all / none" choice is just an option with an empty
 * value passed by the caller, so the trigger shows its label.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";

export type SelectOption = { value: string; label: string };

const TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-60";

type MenuCoords = { top: number; left: number; width: number; openUp: boolean };

// Estimated max menu height (search box + list) for the flip-up decision.
const MENU_MAX_HEIGHT = 320;

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
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const updateCoords = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MENU_MAX_HEIGHT && rect.top > spaceBelow;
      setCoords({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    };

    updateCoords();
    setQuery("");
    const focusId = window.setTimeout(() => inputRef.current?.focus(), 0);

    const onScrollOrResize = () => updateCoords();
    // capture scroll so it fires for inner scroll containers too
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  const menu =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUp ? "translateY(-100%)" : undefined,
              zIndex: 1000,
            }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
          >
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName ?? TRIGGER_CLASS}
      >
        <span
          className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {menu}
    </div>
  );
}
