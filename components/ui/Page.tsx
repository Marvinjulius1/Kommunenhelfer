/** Einheitlicher Rahmen für Inhaltsseiten (Hilfe, Kontakt, Datenschutz …). */
export function Page({ titel, intro, children, breit }: { titel: string; intro?: string; children: React.ReactNode; breit?: boolean }) {
  return (
    <div className={`mx-auto w-full ${breit ? "max-w-4xl" : "max-w-2xl"} px-4 sm:px-6`}>
      <h1 className="text-[34px] font-semibold tracking-[-0.03em] sm:text-[44px]">{titel}</h1>
      {intro && <p className="mt-3 text-[17px] leading-relaxed text-muted">{intro}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function Section({ titel, children, id }: { titel: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24 first:mt-0">
      <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em]">{titel}</h2>
      <div className="space-y-3 text-[16px] leading-relaxed text-fg">{children}</div>
    </section>
  );
}
