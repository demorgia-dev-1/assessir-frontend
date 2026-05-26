"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Topic } from "@/store/slices/topics-slice";
import type {
  DifficultyLevel,
  McqOption,
  QuestionType,
  RubricScore,
} from "@/store/slices/questions-slice";
import { RichTextArea, RichTextToolbar } from "@/components/RichTextEditor";

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

  return (
    <div className="glass-panel rounded-[2rem] border border-white/80 p-7 shadow-soft shadow-slate-900/5">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {batchPositionLabel && (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          {batchPositionLabel}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Question Type
            </label>
            <select
              value={value.type}
              onChange={(event) =>
                setField("type", event.target.value as QuestionType)
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="mcq">MCQ</option>
              <option value="rubric">Rubric</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Difficulty
            </label>
            <select
              value={value.difficultyLvl}
              onChange={(event) =>
                setField("difficultyLvl", event.target.value as DifficultyLevel)
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Topic
            </label>
            <select
              value={value.topicID}
              onChange={(event) => setField("topicID", event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
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

        {/* Shared Text Editor Toolbar at the top */}
        <RichTextToolbar
          onCommand={handleToolbarCommand}
          activeTargetLabel={
            editorTarget === "question"
              ? "Question Text"
              : `Option ${String.fromCharCode(65 + editorTarget)}`
          }
        />

        {/* Question Text Editor (Always present and editable directly) */}
        <div className="flex flex-col gap-2 rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
          <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Question Text Input
          </label>
          <RichTextArea
            ref={questionEditorRef}
            value={value.text}
            onChange={(html) => setField("text", html)}
            onFocus={() => setEditorTarget("question")}
            placeholder="Write the question. You can add formatted text, images, videos, audio, and links."
            minHeight="120px"
            className={
              editorTarget === "question"
                ? "ring-2 ring-slate-900/10 border-slate-400 bg-white"
                : "bg-white"
            }
          />
        </div>

        {value.type === "mcq" ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  MCQ Options
                </h3>
                <p className="mt-1 text-xs text-slate-500">
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Add Option
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {value.metadata.options.map((option, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-2xl border bg-white p-4 ${
                    editorTarget === index
                      ? "border-slate-500 ring-2 ring-slate-200"
                      : "border-slate-200"
                  }`}
                >
                  {/* Correct Option Radio Button on the left */}
                  <div className="pt-7">
                    <input
                      type="radio"
                      name="mcq-correct-option"
                      checked={option.is_correct}
                      onChange={() =>
                        onChange({
                          ...value,
                          metadata: {
                            ...value.metadata,
                            options: value.metadata.options.map((item, itemIndex) => ({
                              ...item,
                              is_correct: itemIndex === index,
                            })),
                          },
                        })
                      }
                      className="h-4.5 w-4.5 cursor-pointer accent-slate-900 border-slate-300 text-slate-900 focus:ring-slate-900"
                      title="Mark as Correct Option"
                    />
                  </div>

                  {/* Option Text Input in the middle */}
                  <div className="flex-1 min-w-0">
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Option {String.fromCharCode(65 + index)}
                    </p>
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
                      placeholder={`Write option ${String.fromCharCode(65 + index)}`}
                      minHeight="64px"
                      className={
                        editorTarget === index
                          ? "ring-2 ring-slate-900/10 border-slate-400 bg-white"
                          : "bg-white"
                      }
                    />
                  </div>

                  {/* Remove Button on the right */}
                  <div className="pt-5 shrink-0">
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
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Remove Option"
                    >
                      <svg
                        className="h-4 w-4"
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
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Rubric Scores
                </h3>
                <p className="mt-1 text-xs text-slate-500">
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Add Score
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {value.metadata.scores.map((score, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_140px_auto]"
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
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
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
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
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
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
        >
          {submitting ? "Processing..." : submitLabel}
        </button>

        {allowBatchActions && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous Question
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next Question
            </button>
            <button
              type="button"
              onClick={onAddMore}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Add More Question
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
