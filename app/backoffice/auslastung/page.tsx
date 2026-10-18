/** Auslastungsprognose: Wo wird es in den nächsten zwei Wochen eng – und wie viele Personen fehlen? */
import { redirect } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { gebuchtProTag, historie } from "@/lib/auslastung/service";
import { prognose } from "@/lib/auslastung/prognose";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { heuteBerlin } from "@/lib/booking/slots";
import { tx } from "@/lib/i18n";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const fmt = (d: string) => new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

export default async function Auslastung() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!aktiv(tenant, "auslastung")) return <p className="text-[14px] text-muted">Diese Funktion ist im Paket Ihrer Gemeinde nicht enthalten.</p>;
  const heute = heuteBerlin();
  const aemter = tenant.aemter.filter((a) => a.termine && darfAmt(b, a.id));
  const daten = await Promise.all(
    aemter.map(async (amt) => {
      const h = await historie(tenant, amt);
      return { amt, beispiel: h.beispiel, tage: prognose(tenant, amt, h.werte, await gebuchtProTag(tenant, amt), heute, 14).filter((t) => !t.geschlossen) };
    }),
  );
  const engpaesse = daten.flatMap((d) => d.tage.filter((t) => t.fehlen > 0 && t.datum <= new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)).map((t) => ({ amt: tx(d.amt.name, "de"), t })));

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Auslastung</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Prognose für die nächsten 14 Tage aus gebuchten Terminen und dem Verlauf der letzten acht Wochen (Termine und Wartenummern je Wochentag).</p>

      <Glass className="mt-8 rounded-[24px] p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold">
          <Icon name={engpaesse.length ? "alert" : "check"} className="size-5" />
          {engpaesse.length ? "Nächste 7 Tage: hier wird es eng" : "Nächste 7 Tage: keine Engpässe erwartet"}
        </h2>
        {engpaesse.length > 0 && (
          <ul className="mt-3 space-y-1 text-[15px]">
            {engpaesse.map(({ amt, t }) => (
              <li key={amt + t.datum}>
                <span className="font-medium">{amt}</span>, {fmt(t.datum)}: {t.fehlen === 1 ? "1 Person" : `${t.fehlen} Personen`} zusätzlich (erwartet {t.erwartet} Kontakte, Auslastung {Math.round(t.auslastung * 100)} %)
              </li>
            ))}
          </ul>
        )}
      </Glass>

      {daten.map(({ amt, tage, beispiel }) => (
        <Glass key={amt.id} className="mt-6 rounded-[24px] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold">{tx(amt.name, "de")}</h2>
            <p className="text-[13px] text-subtle">
              {amt.termine!.parallel} Schalter · {amt.termine!.slotMinuten} Min. je Termin
            </p>
          </div>
          {beispiel && <p className="mt-2 rounded-[12px] bg-[var(--line)] px-3 py-2 text-[13px] text-muted">Demo: Es gibt noch keinen Verlauf – die Prognose nutzt einen Beispielverlauf. Echte Werte entstehen automatisch, sobald das Portal genutzt wird.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[14px]">
              <caption className="sr-only">Prognose für {tx(amt.name, "de")}</caption>
              <thead>
                <tr className="text-left text-[12px] text-subtle">
                  <th scope="col" className="py-2 pr-3 font-medium">Tag</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Gebucht</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Erwartet</th>
                  <th scope="col" className="w-[40%] py-2 pr-3 font-medium">Auslastung</th>
                  <th scope="col" className="py-2 text-right font-medium">Personal</th>
                </tr>
              </thead>
              <tbody>
                {tage.map((t) => (
                  <tr key={t.datum} className="border-t border-[var(--line)]">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">{fmt(t.datum)}</th>
                    <td className="py-2 pr-3 text-right tabular-nums">{t.gebucht}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{t.erwartet}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 rounded-full bg-[var(--line)]" aria-hidden="true">
                          <span className="block h-2 rounded-full" style={{ width: `${Math.min(100, (t.auslastung / 1.5) * 100)}%`, background: t.auslastung > 1 ? "#eb6834" : "#2a78d6" }} />
                        </span>
                        <span className="w-12 text-right tabular-nums">{Math.round(t.auslastung * 100)} %</span>
                      </span>
                    </td>
                    <td className={`py-2 text-right ${t.fehlen ? "font-medium text-danger" : "text-muted"}`}>{t.fehlen ? `+${t.fehlen}` : "ausreichend"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Glass>
      ))}
      {!daten.length && <p className="mt-8 text-[15px] text-muted">Für Ihre Ämter sind keine Termine eingerichtet.</p>}
    </div>
  );
}
