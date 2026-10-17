import { redirect } from "next/navigation";
import { IdeeModeration, UmfrageBeenden, UmfrageFormular } from "@/components/backoffice/Beteiligung";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { alleIdeen, IDEE_STATUS, umfrageOffen, umfragen } from "@/lib/beteiligung/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function BeteiligungBackoffice() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "redaktion")) return <p className="text-[14px] text-muted">Für die Beteiligung benötigen Sie die Rolle „redaktion“.</p>;
  const u = await umfragen(tenant, true);
  const i = await alleIdeen(tenant);
  const offen = i.filter((x) => x.status === "eingereicht");
  const fmt = (iso: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(iso));
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Umfragen</h1>
        <Glass className="mt-6 rounded-[24px] p-6">
          <UmfrageFormular ortsteile={tenant.ortsteile ?? []} />
        </Glass>
        <ul className="mt-6 space-y-3">
          {u.map((x) => {
            const summe = Object.values(x.stimmen).reduce((s, n) => s + n, 0);
            return (
              <li key={x.id}>
                <Glass className="rounded-[20px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold">{x.titel}</p>
                    {umfrageOffen(x) ? <UmfrageBeenden id={x.id} /> : <span className="text-[13px] text-subtle">beendet</span>}
                  </div>
                  <p className="mt-1 text-[13px] text-subtle">
                    bis {fmt(x.bis)} · {x.teilnahmen.length} Teilnahmen{x.ortsteil ? ` · ${x.ortsteil}` : ""}
                  </p>
                  <ul className="mt-3 space-y-1 text-[14px]">
                    {x.optionen.map((o) => (
                      <li key={o.id} className="flex justify-between gap-3">
                        <span>{o.label}</span>
                        <span className="tabular-nums text-muted">
                          {x.stimmen[o.id] ?? 0} ({summe ? Math.round(((x.stimmen[o.id] ?? 0) / summe) * 100) : 0} %)
                        </span>
                      </li>
                    ))}
                  </ul>
                </Glass>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Ideen</h2>
        <p className="mt-1 text-[15px] text-muted">{offen.length} warten auf Prüfung. Ideen erscheinen erst nach Freigabe – bitte auf Beleidigungen und personenbezogene Daten achten.</p>
        <ul className="mt-6 space-y-3">
          {i.length === 0 && <li className="text-[14px] text-muted">Noch keine Ideen.</li>}
          {i.map((x) => (
            <li key={x.id}>
              <Glass className="rounded-[20px] p-5">
                <p className="text-[13px] text-subtle">
                  {x.kategorie}
                  {x.ortsteil ? ` · ${x.ortsteil}` : ""} · {IDEE_STATUS[x.status]} · {x.unterstuetzer.length} Unterstützer · {fmt(x.erstelltAm)}
                </p>
                <p className="mt-1 text-[15px] font-semibold">{x.titel}</p>
                <p className="mt-1 whitespace-pre-wrap text-[14px] text-muted">{x.text}</p>
                <IdeeModeration id={x.id} status={x.status} antwort={x.antwort} />
              </Glass>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
