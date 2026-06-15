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
    <div className="container-x py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-black md:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className="mt-8 grid gap-4">
        {sections.map((section) => (
          <section key={section.title} className="surface p-6">
            <h2 className="text-xl font-black">{section.title}</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
