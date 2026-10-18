import { redirect } from "next/navigation";
import { EhrenamtFormular, VeranstaltungFormular, VeranstaltungLoeschen } from "@/components/backoffice/Veranstaltungen";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { getTenant } from "@/lib/tenant";
import { anmeldungen, belegt, ehrenamt, interessen, veranstaltungen } from "@/lib/veranstaltungen/service";

export const dynamic = "force-dynamic";

const wann = (d: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d.slice(0, 10) + "T12:00:00Z")) + `, ${d.slice(11)}`;

export default async function VeranstaltungenBackoffice() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "redaktion")) return <p className="text-[14px] text-muted">Veranstaltungen pflegen Benutzer mit der Rolle „redaktion“.</p>;
  const liste = await Promise.all((await veranstaltungen(tenant)).map(async (v) => ({ v, a: await anmeldungen(tenant, v.id) })));
  const gesuche = await ehrenamt(tenant);
  const meldungen = await interessen(tenant);
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Veranstaltungen</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Glass className="rounded-[24px] p-6">
            <h2 className="text-[17px] font-semibold">Neue Veranstaltung</h2>
            <VeranstaltungFormular />
          </Glass>
          <div className="space-y-2">
            {liste.map(({ v, a }) => (
              <Glass key={v.id} className="rounded-[18px] px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[15px] font-medium">{v.titel}</p>
                  <p className="text-[12px] text-subtle">{wann(v.beginn)}</p>
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {v.ort}
                  {v.anmeldung ? ` · ${belegt(a)}${v.plaetze ? ` / ${v.plaetze}` : ""} angemeldet${a.some((x) => x.status === "warteliste") ? ` · ${a.filter((x) => x.status === "warteliste").length} auf der Warteliste` : ""}` : ""}
                  {v.quelle === "config" ? " · aus der Konfiguration" : ""}
                </p>
                <div className="mt-2 flex gap-4 text-[13px]">
                  {v.anmeldung && a.length > 0 && (
                    <a href={`/api/backoffice/veranstaltungen/teilnehmer?id=${encodeURIComponent(v.id)}`} className="text-accent underline underline-offset-2">
                      Teilnehmerliste (CSV)
                    </a>
                  )}
                  {v.quelle === "redaktion" && <VeranstaltungLoeschen id={v.id} />}
                </div>
              </Glass>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Ehrenamtsbörse</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Glass className="rounded-[24px] p-6">
            <h3 className="text-[17px] font-semibold">Neues Gesuch</h3>
            <EhrenamtFormular />
          </Glass>
          <div className="space-y-2">
            {gesuche.map((e) => {
              const m = meldungen.filter((x) => x.ehrenamtId === e.id);
              return (
                <Glass key={e.id} className="rounded-[18px] px-5 py-4">
                  <p className="text-[15px] font-medium">{e.titel}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {e.organisation} · {m.length === 1 ? "1 Rückmeldung" : `${m.length} Rückmeldungen`}
                    {!e.kontaktEmail ? " · keine E-Mail hinterlegt – Rückmeldungen nur hier" : ""}
                  </p>
                  {m.length > 0 && (
                    <ul className="mt-2 space-y-2 text-[13px]">
                      {m.map((x) => (
                        <li key={x.id} className="rounded-[12px] bg-[var(--line)] px-3 py-2">
                          <span className="font-medium">{x.d.name}</span> · {x.d.email}
                          {x.d.telefon ? ` · ${x.d.telefon}` : ""}
                          <span className="mt-1 block text-muted">{x.d.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Glass>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
