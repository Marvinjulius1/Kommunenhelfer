import { redirect } from "next/navigation";
import { MeldungEntfernen, MeldungFormular } from "@/components/backoffice/Meldungen";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { alleMeldungen } from "@/lib/meldungen/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MeldungenSeite() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  const darf = hatRolle(b, "redaktion");
  const liste = await alleMeldungen(tenant);
  const jetzt = new Date().toISOString();
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Meldungen</h1>
        <p className="mt-1 text-[15px] text-muted">Erscheinen unter „Aktuelles“, im Bürgerkonto und – wenn gewünscht – als Push-Nachricht im gewählten Ortsteil.</p>
        <Glass className="mt-6 rounded-[24px] p-6">
          {darf ? <MeldungFormular ortsteile={tenant.ortsteile ?? []} pushAktiv={aktiv(tenant, "push")} /> : <p className="text-[14px] text-muted">Zum Veröffentlichen benötigen Sie die Rolle „redaktion“.</p>}
        </Glass>
      </div>
      <ul className="space-y-3 lg:pt-14">
        {liste.length === 0 && <li className="text-[14px] text-muted">Noch keine Meldungen.</li>}
        {liste.map((m) => (
          <li key={m.id}>
            <Glass className={`rounded-[20px] p-5 ${m.gueltigBis < jetzt ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    {m.wichtig && <span className="mr-2 text-danger">Wichtig ·</span>}
                    {m.titel}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[14px] text-muted">{m.text}</p>
                  <p className="mt-2 text-[12px] text-subtle">
                    {m.ortsteil ?? "Ganze Gemeinde"} · bis {fmt.format(new Date(m.gueltigBis))} · {m.autor}
                    {m.gueltigBis < jetzt ? " · abgelaufen" : ""}
                  </p>
                </div>
                {darf && <MeldungEntfernen id={m.id} />}
              </div>
            </Glass>
          </li>
        ))}
      </ul>
    </div>
  );
}
