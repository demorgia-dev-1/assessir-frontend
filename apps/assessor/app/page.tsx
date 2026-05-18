const reviewTasks = [
  "Review submissions",
  "Score competencies",
  "Collaborate with hiring teams"
];

export default function AssessorHomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <section className="rounded-3xl border border-brand-100 bg-white/85 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">
          Assessir Assessor
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-slate-900">
          Help assessors move through reviews with clarity and speed.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          The app scaffold is ready for your reviewer workflows and shares the
          same monorepo foundations as the other portals.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {reviewTasks.map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-white/60 bg-white/90 p-6 shadow-soft"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use this area for queues, rubrics, moderation, or comments.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
