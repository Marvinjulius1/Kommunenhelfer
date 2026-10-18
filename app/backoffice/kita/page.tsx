import Link from "next/link";
import { redirect } from "next/navigation";
import { KitaAktion } from "@/components/backoffice/KitaAktion";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { amtFuer } from "@/lib/backoffice/zugang";
import { alleWuensche, GRUPPE_LABEL, kindVon, rang } from "@/lib/kita/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { wartend: "Warteliste", angebot: "Angebot offen", zugesagt: "Zugesagt", abgesagt: "Abgesagt", zurueckgezogen: "Zurückgezogen" };
const monat = (m: string) => new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(m + "-01T12:00:00Z"));

export default async function KitaBackoffice({ searchParams }: { searchParams: Promise<{ kita?: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!darfAmt(b, amtFuer(tenant, "kita").id)) return <p className="text-[14px] text-muted">Die Kita-Platz-Vergabe sieht das Amt für Jugend und Familie.</p>;
  const kitas = tenant.kitas ?? [];
  const gewaehlt = (await searchParams).kita;
  const kita = kitas.find((k) => k.id === gewaehlt) ?? kitas[0];
  if (!kita) return <p className="text-[14px] text-muted">Es sind keine Kitas eingerichtet.</p>;
  const alle = await alleWuensche(tenant);
  const hier = alle.filter((w) => w.kitas.includes(kita.id));
  const gruppen = (["u3", "ue3", "hort"] as const).filter((g) => kita.altersgruppen.includes(g));
  const zugesagt = hier.filter((w) => w.status[kita.id] === "zugesagt").length;

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Kita-Plätze</h1>
      <nav aria-label="Kita" className="mt-4 flex flex-wrap gap-1 text-[14px]">
        {kitas.map((k) => (
          <Link key={k.id} href={`/backoffice/kita?kita=${k.id}`} aria-current={k.id === kita.id ? "page" : undefined} className={`rounded-full px-4 py-1.5 ${k.id === kita.id ? "bg-fg text-bg" : "bg-[var(--line)]"}`}>
            {k.name}
          </Link>
        ))}
      </nav>
      <p className="mt-4 text-[15px] text-muted">
        {kita.plaetze} Plätze · {zugesagt} zugesagt · {hier.filter((w) => w.status[kita.id] === "wartend").length} auf der Warteliste
      </p>

      {gruppen.map((g) => {
        const liste = hier
          .filter((w) => w.altersgruppe === g && w.status[kita.id] !== "zurueckgezogen")
          .map((w) => ({ w, kind: kindVon(w), rang: rang(alle, w, kita.id) }))
          .sort((x, y) => (x.rang ?? 999) - (y.rang ?? 999) || x.w.erstelltAm.localeCompare(y.w.erstelltAm));
        return (
          <Glass key={g} className="mt-6 rounded-[24px] p-6">
            <h2 className="text-[17px] font-semibold">{GRUPPE_LABEL[g]}</h2>
            {liste.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-[14px]">
                  <thead>
                    <tr className="text-left text-[12px] text-subtle">
                      <th scope="col" className="py-2 pr-3 font-medium">Platz</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Kind</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Ab</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Std.</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Wunsch</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                      <th scope="col" className="py-2 text-right font-medium">
                        <span className="sr-only">Aktion</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map(({ w, kind, rang: r }) => (
                      <tr key={w.id} className="border-t border-[var(--line)] align-top">
                        <td className="py-2 pr-3 tabular-nums">{r ?? "–"}</td>
                        <th scope="row" className="py-2 pr-3 text-left font-normal">
                          {kind.vorname}
                          <span className="block text-[12px] text-subtle">geb. {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(kind.geburtsdatum + "T12:00:00Z"))}</span>
                          {kind.hinweis && <span className="block text-[12px] text-muted">„{kind.hinweis}“</span>}
                        </th>
                        <td className="py-2 pr-3">{monat(w.beginn)}</td>
                        <td className="py-2 pr-3 tabular-nums">{kind.stunden}</td>
                        <td className="py-2 pr-3">{w.kitas.indexOf(kita.id) + 1}.</td>
                        <td className="py-2 pr-3">
                          {STATUS[w.status[kita.id]]}
                          {w.angebot && w.angebot.kitaId !== kita.id && <span className="block text-[12px] text-subtle">hat ein anderes Angebot</span>}
                        </td>
                        <td className="py-2 text-right">{w.status[kita.id] === "wartend" && <KitaAktion id={w.id} kitaId={kita.id} anbietenMoeglich={!w.angebot} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-[14px] text-muted">Keine Anmeldungen.</p>
            )}
          </Glass>
        );
      })}
    </div>
  );
}
