"use client";

import type { ChangeEvent, FocusEvent } from "react";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import {
  FiBold,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiMenu,
  FiMic,
  FiMinus,
  FiPlayCircle,
  FiType,
  FiUnderline,
} from "react-icons/fi";
import { toast } from "react-toastify";

// ==========================================
// 1. Rich Text Toolbar (Shared Component)
// ==========================================

interface RichTextToolbarProps {
  onCommand: (command: string, value?: string) => void;
  activeTargetLabel?: string;
  onUploadAsset?: (file: File, type: "image" | "video" | "audio") => Promise<string>;
}

function buildMediaCommand(type: "image" | "video" | "audio", src: string) {
  if (type === "image") {
    return { command: "insertImage", value: src };
  }

  return {
    command: "insertHTML",
    value:
      type === "video"
        ? `<video controls src="${src}" style="max-width: 100%;"></video>`
        : `<audio controls src="${src}"></audio>`,
  };
}

export function RichTextToolbar({
  onCommand,
  activeTargetLabel,
  onUploadAsset,
}: RichTextToolbarProps) {
  const imageInputId = useId();
  const videoInputId = useId();
  const audioInputId = useId();

  const handleMediaUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "audio"
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!onUploadAsset) {
      toast.error("Save the question first before uploading media files.");
      return;
    }

    try {
      const src = await onUploadAsset(file, type);
      if (!src) {
        return;
      }

      const mediaCommand = buildMediaCommand(type, src);
      onCommand(mediaCommand.command, mediaCommand.value);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload media file.";
      toast.error(message);
    }
  };

  const insertUrlMedia = (type: "image" | "video" | "audio") => {
    const src = window.prompt(`Paste the ${type} URL`);
    if (!src) {
      return;
    }

    const mediaCommand = buildMediaCommand(type, src);
    onCommand(mediaCommand.command, mediaCommand.value);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Rich Text Formatting Toolbar
        </p>
        {activeTargetLabel && (
          <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition animate-fade-in">
            Editing: {activeTargetLabel}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-[1.25rem] border border-slate-200 bg-white p-2">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand("bold")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Bold"
        >
          <FiBold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand("italic")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Italic"
        >
          <FiItalic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand("underline")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Underline"
        >
          <FiUnderline className="h-4 w-4" />
        </button>
        <div className="h-6 w-[1px] bg-slate-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand("insertUnorderedList")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Bullets"
        >
          <FiList className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand("insertOrderedList")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Numbered List"
        >
          <FiMenu className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand("formatBlock", "blockquote")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Quote"
        >
          <FiMinus className="h-4 w-4" />
        </button>
        <div className="h-6 w-[1px] bg-slate-200 mx-1" />
        <select
          defaultValue="Arial"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(event) => onCommand("fontName", event.target.value)}
          className="rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none hover:bg-slate-50"
          title="Font Family"
        >
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
        </select>

        <select
          defaultValue="3"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(event) => onCommand("fontSize", event.target.value)}
          className="rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none hover:bg-slate-50"
          title="Font Size"
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">XL</option>
        </select>

        <label className="flex cursor-pointer items-center rounded-xl border border-slate-100 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50">
          <FiType className="mr-1.5 h-4 w-4" />
          Color
          <input
            type="color"
            className="ml-2 h-5 w-5 cursor-pointer border-none bg-transparent p-0"
            onChange={(event) => onCommand("foreColor", event.target.value)}
          />
        </label>
        <div className="h-6 w-[1px] bg-slate-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const href = window.prompt("Paste the link URL");
            if (href) {
              onCommand("createLink", href);
            }
          }}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Link"
        >
          <FiLink className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertUrlMedia("image")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Insert image URL"
        >
          <FiImage className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertUrlMedia("video")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Insert video URL"
        >
          <FiPlayCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertUrlMedia("audio")}
          className="rounded-xl border border-slate-100 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          title="Insert audio URL"
        >
          <FiMic className="h-4 w-4" />
        </button>
        <div className="h-6 w-[1px] bg-slate-200 mx-1" />
        <label
          htmlFor={imageInputId}
          className="cursor-pointer rounded-xl border border-slate-100 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
        >
          Upload Image
        </label>
        <input
          id={imageInputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleMediaUpload(event, "image")}
        />

        <label
          htmlFor={videoInputId}
          className="cursor-pointer rounded-xl border border-slate-100 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
        >
          Upload Video
        </label>
        <input
          id={videoInputId}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => handleMediaUpload(event, "video")}
        />

        <label
          htmlFor={audioInputId}
          className="cursor-pointer rounded-xl border border-slate-100 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
        >
          Upload Audio
        </label>
        <input
          id={audioInputId}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => handleMediaUpload(event, "audio")}
        />
      </div>
    </div>
  );
}

// ==========================================
// 2. Rich Text Editor Box (Individual Field)
// ==========================================

interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextArea = forwardRef<HTMLDivElement, RichTextAreaProps>(
  ({ value, onChange, onFocus, placeholder, className, minHeight = "160px" }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);

    useEffect(() => {
      if (!editorRef.current || editorRef.current.innerHTML === value) {
        return;
      }
      editorRef.current.innerHTML = value || "";
    }, [value]);

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          .rich-text-editor-area:empty::before {
            content: attr(data-placeholder);
            color: #94a3b8;
            pointer-events: none;
            display: inline-block;
          }
        ` }} />
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || "")}
          onFocus={onFocus}
          className={`rich-text-editor-area w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 ${className || ""}`}
          data-placeholder={placeholder || "Start writing..."}
          style={{ whiteSpace: "pre-wrap", minHeight }}
        />
      </>
    );
  }
);

RichTextArea.displayName = "RichTextArea";
