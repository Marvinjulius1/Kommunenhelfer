/** Wahlamt: Wahlen, Briefwahl-Anträge, Doppelanträge, Versand und Export. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { AntragsListe, NeueWahl, WahlLoeschen } from "@/components/backoffice/Briefwahl";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer } from "@/lib/backoffice/auth";
import { alleWahlen, antraegeFuer } from "@/lib/briefwahl/service";
import { darfWahlamt } from "@/lib/briefwahl/zugang";
import { antragsschluss, fmtSchluss, offen, wahlLabel } from "@/lib/briefwahl/wahlen";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";
import { STATUS_LABEL } from "@/lib/vorgaenge/service";

export const dynamic = "force-dynamic";

const VERSAND: Record<string, string> = { wohnanschrift: "Wohnanschrift", andere: "Andere Anschrift", abholen: "Abholung" };

export default async function BriefwahlSeite({ searchParams }: { searchParams: Promise<{ wahl?: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!aktiv(tenant, "briefwahl")) return <p className="text-[14px] text-muted">Diese Funktion ist für Ihre Gemeinde nicht freigeschaltet.</p>;
  if (!darfWahlamt(tenant, b)) return <p className="text-[14px] text-muted">Die Briefwahl bearbeitet das zuständige Amt.</p>;
  const wahlen = await alleWahlen(tenant);
  const wunsch = (await searchParams).wahl;
  const gewaehlt = wahlen.find((w) => w.id === wunsch) ?? wahlen.find((w) => offen(w)) ?? wahlen.at(-1);
  const antraege = gewaehlt ? await antraegeFuer(tenant, gewaehlt.id) : [];
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
  const geb = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
  const kpi: [string, number][] = [
    ["Anträge", antraege.length],
    ["Offen", antraege.filter((a) => a.v.status !== "erledigt").length],
    ["Versandt", antraege.filter((a) => a.v.status === "erledigt").length],
    ["Doppelanträge prüfen", antraege.filter((a) => a.doppelt).length],
  ];
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Briefwahl</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Online-Anträge auf Wahlschein: Doppelanträge werden markiert (gleicher Name und Geburtstag), versandte Unterlagen mit einem Klick bestätigt und alle Anträge als CSV für die Wahlsoftware exportiert.</p>

      <Glass className="mt-6 rounded-[24px] p-6">
        <h2 className="mb-3 text-[17px] font-semibold">Wahlen</h2>
        {wahlen.length > 0 && (
          <ul className="mb-5 divide-y divide-[var(--line)]">
            {wahlen.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-[14px]">
                <Link href={`/backoffice/briefwahl?wahl=${w.id}`} aria-current={w.id === gewaehlt?.id ? "page" : undefined} className={`font-medium ${w.id === gewaehlt?.id ? "text-accent" : ""}`}>
                  {wahlLabel(w)}
                </Link>
                <span className="flex items-center gap-3 text-muted">
                  {offen(w) ? `Antrag bis ${fmtSchluss(antragsschluss(w))}` : "Antragsschluss vorbei"}
                  {w.quelle === "backoffice" && <WahlLoeschen id={w.id} titel={w.titel} />}
                </span>
              </li>
            ))}
          </ul>
        )}
        <NeueWahl />
      </Glass>

      {gewaehlt && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[20px] font-semibold">{wahlLabel(gewaehlt)}</h2>
            <a href={`/api/backoffice/briefwahl/export?wahl=${gewaehlt.id}`} className="pressable rounded-full border border-[var(--line)] px-4 py-2 text-[14px]">
              Export für Wahlsoftware (CSV)
            </a>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpi.map(([l, n]) => (
              <li key={l}>
                <Glass className="rounded-[20px] p-4">
                  <p className="text-[26px] font-semibold tabular-nums">{n}</p>
                  <p className="text-[13px] text-muted">{l}</p>
                </Glass>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {antraege.length ? (
              <AntragsListe
                zeilen={antraege.map(({ v, w, doppelt }) => ({
                  id: v.id,
                  name: `${w.nachname}, ${w.vorname}`,
                  geburtsdatum: geb(w.geburtsdatum),
                  versand: VERSAND[w.versand] ?? "",
                  eingang: fmt.format(new Date(v.erstelltAm)),
                  status: v.status === "erledigt" ? "Versandt" : STATUS_LABEL[v.status],
                  erledigt: v.status === "erledigt",
                  doppelt,
                }))}
              />
            ) : (
              <p className="text-[14px] text-muted">Noch keine Anträge für diese Wahl.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
