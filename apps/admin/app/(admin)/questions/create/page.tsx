"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";
import QuestionForm, { QuestionFormValues } from "@/components/QuestionForm";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJobRoles } from "@/store/slices/jobroles-slice";
import { createQuestions } from "@/store/slices/questions-slice";
import {
  buildCreatePayload,
  createEmptyForm,
  validateForm,
} from "../question-utils";

export default function CreateQuestionsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { jobRoles } = useAppSelector((state) => state.jobRoles);
  const { creating } = useAppSelector((state) => state.questions);

  const [createForms, setCreateForms] = useState<QuestionFormValues[]>([
    createEmptyForm(),
  ]);
  const [activeCreateIndex, setActiveCreateIndex] = useState(0);

  useEffect(() => {
    dispatch(fetchJobRoles({ page: 1, limit: 1000 }));
  }, [dispatch]);

  const activeCreateForm = createForms[activeCreateIndex] || createEmptyForm();

  const updateActiveCreateForm = (nextValue: QuestionFormValues) => {
    setCreateForms((current) =>
      current.map((form, index) =>
        index === activeCreateIndex ? nextValue : form
      )
    );
  };

  const handleAddMoreQuestion = () => {
    setCreateForms((current) => [...current, createEmptyForm()]);
    setActiveCreateIndex(createForms.length);
  };

  const handleCreateQuestion = async (event: FormEvent) => {
    event.preventDefault();
    for (let index = 0; index < createForms.length; index += 1) {
      const validationMessage = validateForm(createForms[index]);
      if (validationMessage) {
        setActiveCreateIndex(index);
        toast.error(`Question ${index + 1}: ${validationMessage}`);
        return;
      }
    }

    const resultAction = await dispatch(
      createQuestions(createForms.map(buildCreatePayload))
    );

    if (createQuestions.fulfilled.match(resultAction)) {
      toast.success(
        `${createForms.length} question${
          createForms.length > 1 ? "s" : ""
        } created successfully.`
      );
      router.push("/questions");
    }
  };

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col gap-6">
      <button
        type="button"
        onClick={() => router.push("/questions")}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to Questions
      </button>

      <div className="mx-auto flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] shadow-2xl">
        <QuestionForm
          title="Create Questions"
          description="Draft one or more MCQ or rubric questions, then save them together in a single request."
          jobRoles={jobRoles}
          value={activeCreateForm}
          onChange={updateActiveCreateForm}
          onSubmit={handleCreateQuestion}
          submitLabel={`Save ${createForms.length} Question${
            createForms.length > 1 ? "s" : ""
          }`}
          submitting={creating}
          allowBatchActions
          batchPositionLabel={`Question ${activeCreateIndex + 1} of ${
            createForms.length
          }`}
          onAddMore={handleAddMoreQuestion}
          onPrevious={() =>
            setActiveCreateIndex((current) => Math.max(0, current - 1))
          }
          onNext={() =>
            setActiveCreateIndex((current) =>
              Math.min(createForms.length - 1, current + 1)
            )
          }
          hasPrevious={activeCreateIndex > 0}
          hasNext={activeCreateIndex < createForms.length - 1}
        />
      </div>
    </section>
  );
}
