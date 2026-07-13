"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import BatchForm from "../BatchForm";

export default function CreateBatchPage() {
  const router = useRouter();

  return (
    <section className="flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col gap-6">
      <button
        type="button"
        onClick={() => router.push("/batches")}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to Batches
      </button>

      <div className="flex justify-center">
        <BatchForm
          mode="create"
          onSuccess={() => router.push("/batches")}
          onCancel={() => router.push("/batches")}
        />
      </div>
    </section>
  );
}
