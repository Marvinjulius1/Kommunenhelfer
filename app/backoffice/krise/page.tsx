/** Krisenmodus: Lage setzen, Lagemeldungen veröffentlichen, beenden. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { KriseBeenden, KrisenFormular, Lagemeldung } from "@/components/backoffice/Krise";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { leereLage, letzteLage } from "@/lib/krise/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function KriseSeite() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!aktiv(tenant, "krisenmodus")) return <p className="text-[14px] text-muted">Diese Funktion ist für Ihre Gemeinde nicht freigeschaltet.</p>;
  const lage = await letzteLage(tenant);
  const istAktiv = !!lage?.aktiv;
  const start = lage ?? leereLage(tenant);
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const darf = hatRolle(b, "redaktion");
  const pushAktiv = aktiv(tenant, "push");
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Krisenmodus</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted">Bei Hochwasser, Stromausfall, Unwetter oder Evakuierung wird die Startseite zur Lage-Seite: Notrufe, Hotline, Anlaufstellen, Verhaltenstipps und laufende Meldungen – auf allen Seiten mit Banner.</p>
        </div>
        {istAktiv ? (
          <p className="flex items-center gap-2 rounded-full bg-[#b42318] px-4 py-1.5 text-[13px] font-medium text-white">
            <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
            Aktiv seit {fmt.format(new Date(lage!.seit!))}
          </p>
        ) : (
          <p className="rounded-full bg-[var(--line)] px-4 py-1.5 text-[13px]">Nicht aktiv</p>
        )}
      </div>
      {!darf ? (
        <p className="mt-6 text-[14px] text-muted">Den Krisenmodus steuern Benutzer mit der Rolle „redaktion“.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Glass className="rounded-[24px] p-6">
            <h2 className="mb-4 text-[17px] font-semibold">{istAktiv ? "Lage bearbeiten" : "Lage festlegen"}</h2>
            <KrisenFormular start={start} aktiv={istAktiv} gemeinde={`${tenant.art} ${tenant.name}`} pushAktiv={pushAktiv} />
          </Glass>
          <div className="space-y-6">
            {istAktiv && (
              <Glass className="rounded-[24px] p-6">
                <Lagemeldung pushAktiv={pushAktiv} />
                <ul className="mt-5 space-y-3 border-t border-[var(--line)] pt-4">
                  {lage!.meldungen.length === 0 && <li className="text-[13px] text-muted">Noch keine Lagemeldungen.</li>}
                  {lage!.meldungen.map((m) => (
                    <li key={m.id} className="text-[14px]">
                      <span className="text-[12px] text-subtle">{fmt.format(new Date(m.zeit))}</span>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </li>
                  ))}
                </ul>
              </Glass>
            )}
            <Glass className="rounded-[24px] p-6 text-[14px]">
              <p>
                Bürgerinnen und Bürger sehen die Lage unter{" "}
                <Link href="/lage" target="_blank" className="text-accent underline underline-offset-2">
                  /lage
                </Link>{" "}
                {istAktiv ? "und auf der Startseite." : "– sobald der Krisenmodus aktiv ist, auch auf der Startseite."}
              </p>
              <p className="mt-2 text-muted">Amtliche Warnungen (NINA) erscheinen dort automatisch mit. Jede Änderung steht im Protokoll.</p>
              {istAktiv && (
                <div className="mt-4">
                  <KriseBeenden />
                </div>
              )}
            </Glass>
          </div>
        </div>
      )}
    </div>
  );
}
