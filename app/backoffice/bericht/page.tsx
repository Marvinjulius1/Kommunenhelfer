/**
 * Wirkungsbericht für Bürgermeister/in und Gemeinderat – druckbar als PDF.
 * Nur Tageszähler und anonyme Bewertungen, keine Personendaten.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Drucken } from "@/components/backoffice/Drucken";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { feedbackSeit, feedbackText } from "@/lib/feedback/service";
import { tx } from "@/lib/i18n";
import { statistikZeitraum } from "@/lib/statistik";
import { getTenant } from "@/lib/tenant";
import { annahmen, kennzahlen, veraenderung, zeitraum, ZEITRAUM_LABEL, type ZeitraumArt } from "@/lib/wirkung";

export const dynamic = "force-dynamic";

const zahl = (n: number, stellen = 0) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: stellen, minimumFractionDigits: stellen }).format(n);
const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const prozent = (n: number) => `${zahl(n * 100)} %`;

function Trend({ jetzt, vorher, besserWennKleiner }: { jetzt: number; vorher: number; besserWennKleiner?: boolean }) {
  const v = veraenderung(jetzt, vorher);
  if (v === null || v === 0) return <span className="text-[12px] text-subtle">{v === 0 ? "wie im Vorzeitraum" : "kein Vergleichswert"}</span>;
  const gut = besserWennKleiner ? v < 0 : v > 0;
  return (
    <span className={`text-[12px] font-medium ${gut ? "text-success" : "text-subtle"}`}>
      {v > 0 ? "▲" : "▼"} {v > 0 ? "+" : ""}
      {v} % zum Vorzeitraum
    </span>
  );
}

export default async function Bericht({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "admin")) return <p className="text-[14px] text-muted">Den Wirkungsbericht sehen Benutzer mit der Rolle „admin“.</p>;

  const art = ((await searchParams).zeitraum ?? "monat") as ZeitraumArt;
  const z = zeitraum(art in ZEITRAUM_LABEL ? art : "monat", new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }));
  const a = annahmen(tenant);
  const k = kennzahlen(await statistikZeitraum(tenant.slug, z.von, z.bis), a);
  const v = kennzahlen(await statistikZeitraum(tenant.slug, z.vorVon, z.vorBis), a);

  const feedback = await feedbackSeit(tenant, z.von + "T00:00:00Z");
  const verteilung = [5, 4, 3, 2, 1].map((n) => ({ note: n, anzahl: feedback.filter((f) => f.note === n).length }));
  const stimmen = feedback
    .map((f) => ({ f, text: feedbackText(f) }))
    .filter((x) => x.text)
    .slice(0, 6);
  const top = Object.entries(k.leistungen)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 10)
    .map(([id, n]) => ({ titel: tx(tenant.leistungen.find((l) => l.id === id)?.titel ?? id, "de"), n }));
  const max = Math.max(1, ...top.map((t) => t.n));

  const haupt = [
    { wert: zahl(k.antraege), label: "Anliegen online eingereicht", trend: <Trend jetzt={k.antraege} vorher={v.antraege} /> },
    { wert: k.onlineQuote === null ? "–" : prozent(k.onlineQuote), label: "Anteil online", hinweis: "an allen erfassten Anliegen (online, Termine, Wartenummern)" },
    { wert: `${zahl(k.gesparteStunden, k.gesparteStunden < 10 ? 1 : 0)} h`, label: "Arbeitszeit eingespart", trend: <Trend jetzt={k.gesparteStunden} vorher={v.gesparteStunden} /> },
    { wert: euro(k.gesparteEuro), label: "Gegenwert", hinweis: `inkl. ${euro(k.portoEuro)} Porto und Druck` },
  ];
  const weitere = [
    { wert: k.dauerTage === null ? "–" : `${zahl(k.dauerTage, 1)} Tage`, label: "Ø Bearbeitungsdauer", hinweis: k.erledigt === 1 ? "1 Vorgang erledigt" : `${zahl(k.erledigt)} Vorgänge erledigt`, trend: k.dauerTage !== null && v.dauerTage !== null ? <Trend jetzt={k.dauerTage} vorher={v.dauerTage} besserWennKleiner /> : undefined },
    { wert: k.fristQuote === null ? "–" : prozent(k.fristQuote), label: "in der Frist erledigt" },
    { wert: k.zufriedenheit === null ? "–" : `${zahl(k.zufriedenheit, 1)} / 5`, label: "Zufriedenheit", hinweis: k.bewertungen === 1 ? "1 Bewertung" : `${zahl(k.bewertungen)} Bewertungen` },
    { wert: zahl(k.termine), label: "Termine online gebucht", trend: <Trend jetzt={k.termine} vorher={v.termine} /> },
    { wert: zahl(k.bescheide), label: "Bescheide digital zugestellt", hinweis: "statt per Brief" },
    { wert: euro(k.umsatzCent / 100), label: "Gebühren online bezahlt", hinweis: k.zahlungen === 1 ? "1 Zahlung" : `${zahl(k.zahlungen)} Zahlungen` },
    { wert: zahl(k.auskuenfte), label: "Fragen sicher beantwortet", hinweis: k.anfragen ? `von ${zahl(k.anfragen)} an den Assistenten` : undefined },
    { wert: zahl(k.kontenNeu), label: "neue Bürgerkonten" },
    { wert: zahl(k.maengel), label: "Mängel gemeldet" },
  ];

  return (
    <article className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tenant.wappen} alt="" width={120} height={140} className="h-14 w-auto" />
          <div>
            <p className="text-[13px] text-subtle">
              {tenant.art} {tenant.name}
            </p>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Wirkungsbericht Bürgerportal</h1>
            <p className="text-[15px] text-muted">{z.titel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <nav aria-label="Zeitraum" className="flex flex-wrap gap-1 rounded-full bg-[var(--line)] p-1 text-[13px]">
            {(Object.keys(ZEITRAUM_LABEL) as ZeitraumArt[]).map((x) => (
              <Link key={x} href={`/backoffice/bericht?zeitraum=${x}`} aria-current={x === art ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${x === art ? "bg-surface font-medium shadow-sm" : "text-muted"}`}>
                {ZEITRAUM_LABEL[x]}
              </Link>
            ))}
          </nav>
          <Drucken />
        </div>
      </div>

      <h2 className="sr-only">Wichtigste Kennzahlen</h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {haupt.map((x) => (
          <li key={x.label}>
            <Glass className="h-full rounded-[20px] p-5">
              <p className="text-[30px] font-semibold tabular-nums tracking-tight">{x.wert}</p>
              <p className="mt-1 text-[14px] font-medium">{x.label}</p>
              {x.hinweis && <p className="mt-1 text-[12px] text-subtle">{x.hinweis}</p>}
              {x.trend && <p className="mt-2">{x.trend}</p>}
            </Glass>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-[17px] font-semibold">Service und Bearbeitung</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {weitere.map((x) => (
          <li key={x.label}>
            <Glass className="h-full rounded-[20px] p-5">
              <p className="text-[22px] font-semibold tabular-nums tracking-tight">{x.wert}</p>
              <p className="mt-1 text-[13px] text-muted">{x.label}</p>
              {x.hinweis && <p className="mt-1 text-[12px] text-subtle">{x.hinweis}</p>}
              {x.trend && <p className="mt-1">{x.trend}</p>}
            </Glass>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Häufigste Anliegen</h2>
          {top.length ? (
            <table className="mt-4 w-full text-[14px]">
              <caption className="sr-only">Anliegen nach Anzahl</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Leistung</th>
                  <th scope="col">Anzahl</th>
                </tr>
              </thead>
              <tbody>
                {top.map((t) => (
                  <tr key={t.titel}>
                    <td className="py-1.5 pr-4">
                      {t.titel}
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--line)]" aria-hidden="true">
                        <div className="h-1.5 rounded-full bg-[#2a78d6]" style={{ width: `${(t.n / max) * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-1.5 text-right align-top tabular-nums">{zahl(t.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-[14px] text-muted">Im Zeitraum noch keine Anliegen.</p>
          )}
        </Glass>

        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Was Bürgerinnen und Bürger sagen</h2>
          {feedback.length ? (
            <>
              <ul className="mt-4 space-y-1.5 text-[14px]" aria-label="Verteilung der Bewertungen">
                {verteilung.map((x) => (
                  <li key={x.note} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
                    <span className="tabular-nums text-muted">{x.note} / 5</span>
                    <span className="h-2 rounded-full bg-[var(--line)]" aria-hidden="true">
                      <span className="block h-2 rounded-full bg-[#2a78d6]" style={{ width: `${(x.anzahl / feedback.length) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums">{x.anzahl}</span>
                  </li>
                ))}
              </ul>
              {stimmen.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {stimmen.map(({ f, text }) => (
                    <li key={f.id} className="border-l-2 border-[var(--line)] pl-4 text-[14px]">
                      <p className="leading-relaxed">„{text}“</p>
                      <p className="mt-1 text-[12px] text-subtle">
                        {f.note} / 5{f.leistungId ? ` · ${tx(tenant.leistungen.find((l) => l.id === f.leistungId)?.titel ?? f.leistungId, "de")}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-4 text-[14px] text-muted">Im Zeitraum noch keine Bewertungen.</p>
          )}
        </Glass>
      </div>

      <section className="mt-10 text-[13px] leading-relaxed text-muted">
        <h2 className="text-[14px] font-semibold text-fg">Grundlage und Annahmen</h2>
        <p className="mt-2">
          Alle Zahlen stammen aus anonymen Tageszählern des Portals – ohne Namen, IP-Adressen oder Cookies. Die eingesparte Arbeitszeit ist eine Schätzung: {a.minutenProAntrag} Minuten je Online-Antrag (keine Erfassung von Papier, kein
          Schalterkontakt), {a.minutenProTermin} Minuten je online gebuchtem Termin (kein Telefonat), {a.minutenProAuskunft} Minuten je sicher beantworteter Frage. Bewertet mit {euro(a.stundensatzEuro)} je Stunde, Porto und Druck mit{" "}
          {zahl(a.portoCent / 100, 2)} € je Bescheid. Die Annahmen lassen sich in der Konfiguration der Gemeinde anpassen.
        </p>
        <p className="mt-2">
          Vergleichszeitraum: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(z.vorVon + "T12:00:00Z"))} –{" "}
          {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(z.vorBis + "T12:00:00Z"))}. Erstellt am{" "}
          {new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date())}.
        </p>
      </section>
    </article>
  );
}
