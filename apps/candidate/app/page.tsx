const steps = [
  "Review your application timeline",
  "Complete assessments with confidence",
  "Track feedback and next steps"
];

export default function CandidateHomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <section className="rounded-3xl border border-brand-100 bg-white/85 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">
          Assessir Candidate
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-slate-900">
          Give candidates a clean, focused assessment journey.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          This starter app lives in the same Turborepo and shares the base
          TypeScript, ESLint, and Tailwind setup.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-white/60 bg-white/90 p-6 shadow-soft"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Swap this placeholder with your onboarding, assessments, or
              results experience.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

