// @ts-nocheck
"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import type { Topic } from "@/store/slices/topics-slice";
import type {
  DifficultyLevel,
  McqOption,
  QuestionType,
  RubricScore,
} from "@/store/slices/questions-slice";
import { RichTextArea, RichTextToolbar } from "@/components/RichTextEditor";
import api from "@/lib/api";

export type QuestionFormValues = {
  text: string;
  type: QuestionType;
  difficultyLvl: DifficultyLevel;
  topicID: string;
  metadata: {
    options: McqOption[];
    scores: RubricScore[];
  };
};

interface QuestionFormProps {
  title: string;
  description: string;
  topics: Topic[];
  value: QuestionFormValues;
  questionId?: string | number;
  onChange: (value: QuestionFormValues) => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  submitting: boolean;
  allowBatchActions?: boolean;
  batchPositionLabel?: string;
  onAddMore?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

type EditorTarget = "question" | number;

type PresignedUrlResponse = {
  url?: string;
  presignedUrl?: string;
  uploadUrl?: string;
  assetUrl?: string;
  publicUrl?: string;
  fileUrl?: string;
  location?: string;
};

function updateOption(
  options: McqOption[],
  index: number,
  key: keyof McqOption,
  value: string | boolean
) {
  return options.map((option, optionIndex) => {
    if (optionIndex !== index) {
      return option;
    }

    return {
      ...option,
      [key]: value,
    };
  });
}

function updateScore(
  scores: RubricScore[],
  index: number,
  key: keyof RubricScore,
  value: string | number
) {
  return scores.map((score, scoreIndex) => {
    if (scoreIndex !== index) {
      return score;
    }

    return {
      ...score,
      [key]: value,
    };
  });
}

export default function QuestionForm({
  title,
  description,
  topics,
  value,
  questionId,
  onChange,
  onSubmit,
  submitLabel,
  submitting,
  allowBatchActions = false,
  batchPositionLabel,
  onAddMore,
  onNext,
  onPrevious,
  hasPrevious = false,
  hasNext = false,
}: QuestionFormProps) {
  const isEditMode = Boolean(questionId);
  const [editorTarget, setEditorTarget] = useState<EditorTarget>("question");
  const questionEditorRef = useRef<HTMLDivElement>(null);
  const optionsRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setEditorTarget("question");
  }, [batchPositionLabel, value.type]);

  const setField = <K extends keyof QuestionFormValues>(
    key: K,
    fieldValue: QuestionFormValues[K]
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const handleToolbarCommand = (command: string, commandValue?: string) => {
    const activeEditor =
      editorTarget === "question"
        ? questionEditorRef.current
        : optionsRefs.current[editorTarget];

    if (activeEditor) {
      activeEditor.focus();
      document.execCommand(command, false, commandValue);

      const newHtml = activeEditor.innerHTML || "";
      if (editorTarget === "question") {
        setField("text", newHtml);
      } else {
        onChange({
          ...value,
          metadata: {
            ...value.metadata,
            options: updateOption(
              value.metadata.options,
              editorTarget,
              "text",
              newHtml
            ),
          },
        });
      }
    }
  };

  const handleAssetUpload = async (
    file: File,
    _type: "image" | "video" | "audio"
  ) => {
    if (!questionId) {
      throw new Error("Save the question first before uploading media files.");
    }

    let presignedUrl = "";
    let assetUrl = "";

    try {
      const response = await api.get<PresignedUrlResponse>(
        `/questions/${questionId}/presigned-url`,
        {
          fileName: file.name,
          contentType: file.type,
        }
      );

      presignedUrl =
        response.data.presignedUrl ||
        response.data.uploadUrl ||
        response.data.url ||
        "";
      assetUrl =
        response.data.assetUrl ||
        response.data.publicUrl ||
        response.data.fileUrl ||
        response.data.location ||
        "";
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ||
            "Failed to get a presigned upload URL."
          : "Failed to get a presigned upload URL.";
      throw new Error(message);
    }

    if (!presignedUrl) {
      throw new Error("Presigned upload URL was not returned by the server.");
    }

    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Uploading the media file failed.");
    }

    return assetUrl || presignedUrl.split("?")[0];
  };

  return (
    <div className="glass-panel rounded-[1.5rem] border border-white/80 p-5 shadow-soft shadow-slate-900/5 h-full flex flex-col overflow-hidden">
      <h2 className="text-base font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      {batchPositionLabel && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {batchPositionLabel}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="mt-4 flex flex-col gap-3.5 flex-1 min-h-0 overflow-hidden"
      >
        <div className="grid gap-3 sm:grid-cols-3 shrink-0">
          <div className="flex flex-col gap-1">
            <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Question Type
            </label>
            <select
              value={value.type}
              onChange={(event) =>
                setField("type", event.target.value as QuestionType)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="mcq">MCQ</option>
              <option value="rubric">Rubric</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Difficulty
            </label>
            <select
              value={value.difficultyLvl}
              onChange={(event) =>
                setField("difficultyLvl", event.target.value as DifficultyLevel)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Topic
            </label>
            <select
              value={value.topicID}
              onChange={(event) => setField("topicID", event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={String(topic.id)}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEditMode && (
          <div className="shrink-0">
            <RichTextToolbar
              onCommand={handleToolbarCommand}
              onUploadAsset={handleAssetUpload}
              activeTargetLabel={
                editorTarget === "question"
                  ? "Question Text"
                  : `Option ${String.fromCharCode(65 + editorTarget)}`
              }
            />
          </div>
        )}

        {/* Scrollable Container for Question Text and Options/Scores */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3.5">
          {/* Question Text Editor (Always present and editable directly) */}
          <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm shrink-0">
            <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {isEditMode ? "Question Text Input" : "Question Text"}
            </label>
            {isEditMode ? (
              <RichTextArea
                ref={questionEditorRef}
                value={value.text}
                onChange={(html) => setField("text", html)}
                onFocus={() => setEditorTarget("question")}
                placeholder="Write the question. You can add formatted text, images, videos, audio, and links."
                minHeight="80px"
                className={
                  editorTarget === "question"
                    ? "ring-2 ring-slate-900/10 border-slate-400 bg-white text-xs"
                    : "bg-white text-xs"
                }
              />
            ) : (
              <textarea
                value={value.text}
                onChange={(event) => setField("text", event.target.value)}
                placeholder="Write the question."
                className="min-h-[96px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-xs leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
              />
            )}
          </div>

          {value.type === "mcq" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col shrink-0">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-950">
                    MCQ Options
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Add answer choices and mark exactly one correct option.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      metadata: {
                        ...value.metadata,
                        options: [
                          ...value.metadata.options,
                          { text: "", is_correct: false },
                        ],
                      },
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50 shrink-0"
                >
                  Add Option
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {value.metadata.options.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 rounded-xl border bg-white p-3 shrink-0 ${
                      editorTarget === index
                        ? "border-slate-500 ring-2 ring-slate-200"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Correct Option Radio Button on the left */}
                    <div className="pt-4 shrink-0">
                      <input
                        type="radio"
                        name="mcq-correct-option"
                        checked={option.is_correct}
                        onChange={() =>
                          onChange({
                            ...value,
                            metadata: {
                              ...value.metadata,
                              options: value.metadata.options.map(
                                (item, itemIndex) => ({
                                  ...item,
                                  is_correct: itemIndex === index,
                                })
                              ),
                            },
                          })
                        }
                        className="h-4 w-4 cursor-pointer accent-slate-900 border-slate-300 text-slate-900 focus:ring-slate-900"
                        title="Mark as Correct Option"
                      />
                    </div>

                    {/* Option Text Input in the middle */}
                    <div className="flex-1 min-w-0">
                      <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">
                        Option {String.fromCharCode(65 + index)}
                      </p>
                      {isEditMode ? (
                        <RichTextArea
                          ref={(el) => {
                            optionsRefs.current[index] = el;
                          }}
                          value={option.text}
                          onChange={(html) => {
                            onChange({
                              ...value,
                              metadata: {
                                ...value.metadata,
                                options: updateOption(
                                  value.metadata.options,
                                  index,
                                  "text",
                                  html
                                ),
                              },
                            });
                          }}
                          onFocus={() => setEditorTarget(index)}
                          placeholder={`Write option ${String.fromCharCode(
                            65 + index
                          )}`}
                          minHeight="48px"
                          className={
                            editorTarget === index
                              ? "ring-2 ring-slate-900/10 border-slate-400 bg-white text-xs"
                              : "bg-white text-xs"
                          }
                        />
                      ) : (
                        <textarea
                          value={option.text}
                          onChange={(event) =>
                            onChange({
                              ...value,
                              metadata: {
                                ...value.metadata,
                                options: updateOption(
                                  value.metadata.options,
                                  index,
                                  "text",
                                  event.target.value
                                ),
                              },
                            })
                          }
                          placeholder={`Write option ${String.fromCharCode(
                            65 + index
                          )}`}
                          className="min-h-[72px] w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-xs leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                        />
                      )}
                    </div>

                    {/* Remove Button on the right */}
                    <div className="pt-3 shrink-0">
                      <button
                        type="button"
                        disabled={value.metadata.options.length <= 2}
                        onClick={() => {
                          onChange({
                            ...value,
                            metadata: {
                              ...value.metadata,
                              options: value.metadata.options.filter(
                                (_, optionIndex) => optionIndex !== index
                              ),
                            },
                          });
                          if (editorTarget === index) {
                            setEditorTarget("question");
                          } else if (
                            typeof editorTarget === "number" &&
                            editorTarget > index
                          ) {
                            setEditorTarget(editorTarget - 1);
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Remove Option"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col shrink-0">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-950">
                    Rubric Scores
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Add label and percentage pairs used to score this response.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      metadata: {
                        ...value.metadata,
                        scores: [
                          ...value.metadata.scores,
                          { label: "", percentage: 0 },
                        ],
                      },
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50 shrink-0"
                >
                  Add Score
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {value.metadata.scores.map((score, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_100px_auto] shrink-0"
                  >
                    <input
                      type="text"
                      value={score.label}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          metadata: {
                            ...value.metadata,
                            scores: updateScore(
                              value.metadata.scores,
                              index,
                              "label",
                              event.target.value
                            ),
                          },
                        })
                      }
                      placeholder={`Label ${index + 1}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score.percentage}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          metadata: {
                            ...value.metadata,
                            scores: updateScore(
                              value.metadata.scores,
                              index,
                              "percentage",
                              Number(event.target.value)
                            ),
                          },
                        })
                      }
                      placeholder="Percentage"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    />
                    <button
                      type="button"
                      disabled={value.metadata.scores.length <= 2}
                      onClick={() =>
                        onChange({
                          ...value,
                          metadata: {
                            ...value.metadata,
                            scores: value.metadata.scores.filter(
                              (_, scoreIndex) => scoreIndex !== index
                            ),
                          },
                        })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? "Processing..." : submitLabel}
          </button>

          {allowBatchActions && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Previous Question
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next Question
              </button>
              <button
                type="button"
                onClick={onAddMore}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Add More Question
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
