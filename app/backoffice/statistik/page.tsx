import Link from "next/link";
import { redirect } from "next/navigation";
import { TopLeistungen, Verlauf, type Tag } from "@/components/backoffice/Statistik";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { plusTage } from "@/lib/feiertage";
import { tx } from "@/lib/i18n";
import { statistik, type Zaehler } from "@/lib/statistik";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ZEITRAEUME = [30, 90, 365];

export default async function StatistikSeite({ searchParams }: { searchParams: Promise<{ tage?: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "admin")) return <p className="text-[14px] text-muted">Die Statistik sehen Benutzer mit der Rolle „admin“.</p>;
  const tage = ZEITRAEUME.includes(Number((await searchParams).tage)) ? Number((await searchParams).tage) : 30;
  const daten = await statistik(tenant.slug, tage);
  const summe = (z: Zaehler) => daten.reduce((s, d) => s + (d.zaehler[z] ?? 0), 0);

  // Lückenlose Tagesreihe (Tage ohne Nutzung = 0)
  const heute = new Date().toISOString().slice(0, 10);
  const proTag = new Map(daten.map((d) => [d.datum, d]));
  const reihe: Tag[] = Array.from({ length: tage }, (_, i) => plusTage(heute, i - tage + 1)).map((datum) => ({
    datum,
    vorgaenge: proTag.get(datum)?.zaehler.vorgaenge ?? 0,
    termine: proTag.get(datum)?.zaehler.termine ?? 0,
  }));

  const leistungen = new Map<string, number>();
  for (const d of daten) for (const [id, n] of Object.entries(d.leistungen)) leistungen.set(id, (leistungen.get(id) ?? 0) + n);
  const top = [...leistungen.entries()]
    .sort((a, c) => c[1] - a[1])
    .slice(0, 8)
    .map(([id, anzahl]) => ({ titel: tx(tenant.leistungen.find((l) => l.id === id)?.titel ?? id, "de"), anzahl }));

  const anfragen = summe("assistent_anfragen");
  const quote = anfragen ? Math.round((summe("assistent_beantwortet") / anfragen) * 100) : null;
  const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(summe("zahlungen_cent") / 100);
  const kacheln: { wert: string; label: string; hinweis?: string }[] = [
    { wert: String(summe("vorgaenge")), label: "Anliegen online eingegangen" },
    { wert: String(summe("termine")), label: "Termine gebucht" },
    { wert: euro, label: "online bezahlt", hinweis: `${summe("zahlungen")} Zahlungen` },
    { wert: String(summe("bescheide_digital")), label: "Bescheide digital zugestellt", hinweis: "statt per Brief" },
    { wert: String(anfragen), label: "Fragen an den Assistenten", hinweis: quote !== null ? `${quote} % sicher beantwortet` : undefined },
    { wert: String(summe("konten_neu")), label: "neue Bürgerkonten" },
    { wert: String(summe("maengel")), label: "Mängel gemeldet" },
    { wert: String(summe("wartemarken")), label: "Wartenummern online" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Statistik</h1>
          <p className="mt-1 text-[15px] text-muted">Nur Tageszähler – keine Personendaten, keine IP-Adressen, keine Cookies.</p>
        </div>
        <nav aria-label="Zeitraum" className="flex gap-1 rounded-full bg-[var(--line)] p-1 text-[14px]">
          {ZEITRAEUME.map((t) => (
            <Link key={t} href={`/backoffice/statistik?tage=${t}`} aria-current={t === tage ? "page" : undefined} className={`rounded-full px-4 py-1.5 ${t === tage ? "bg-surface font-medium shadow-sm" : "text-muted"}`}>
              {t === 365 ? "1 Jahr" : `${t} Tage`}
            </Link>
          ))}
        </nav>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kacheln.map((k) => (
          <li key={k.label}>
            <Glass className="h-full rounded-[20px] p-5">
              <p className="text-[28px] font-semibold tabular-nums tracking-tight">{k.wert}</p>
              <p className="mt-1 text-[13px] text-muted">{k.label}</p>
              {k.hinweis && <p className="mt-1 text-[12px] text-subtle">{k.hinweis}</p>}
            </Glass>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Glass className="min-w-0 rounded-[24px] p-6">
          <h2 className="mb-4 text-[16px] font-semibold">Vorgänge und Termine pro Tag</h2>
          <Verlauf tage={reihe} />
        </Glass>
        <Glass className="min-w-0 rounded-[24px] p-6">
          <h2 className="mb-4 text-[16px] font-semibold">Häufigste Anliegen</h2>
          <TopLeistungen liste={top} />
        </Glass>
      </div>
    </div>
  );
}
