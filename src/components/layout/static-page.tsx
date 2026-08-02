type StaticPageProps = {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
};

export function StaticPage({ title, subtitle, sections }: StaticPageProps) {
  return (
    <div className="container-x py-10 md:py-14">
      <div className="max-w-3xl border-b border-[var(--line)] pb-7">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)] md:text-lg">{subtitle}</p>
      </div>
      <div className="mt-7 grid max-w-4xl gap-3">
        {sections.map((section) => (
          <section key={section.title} className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-6">
            <h2 className="text-lg font-bold">{section.title}</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
