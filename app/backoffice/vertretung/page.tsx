import { redirect } from "next/navigation";
import { VertretungEntfernen, VertretungFormular } from "@/components/backoffice/Vertretung";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, benutzerListe } from "@/lib/backoffice/auth";
import { vertretungen } from "@/lib/backoffice/vertretung";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function VertretungSeite() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  const kollegen = benutzerListe()
    .filter((x) => (x.gemeinde === "*" || x.gemeinde === tenant.slug) && x.name !== b.name)
    .map((x) => x.name);
  const liste = await vertretungen(tenant);
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const fmt = (d: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  return (
    <div className="max-w-2xl">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Abwesenheit und Vertretung</h1>
      <p className="mt-1 text-[15px] text-muted">Während Ihrer Abwesenheit sieht die Vertretung Ihre zugewiesenen Vorgänge unter „Mir zugewiesen“. Bei der Zuweisung ist erkennbar, wer abwesend ist.</p>
      <Glass className="mt-6 rounded-[24px] p-6">
        <VertretungFormular kollegen={kollegen} />
      </Glass>
      <ul className="mt-6 space-y-2">
        {liste.length === 0 && <li className="text-[14px] text-muted">Keine Abwesenheiten eingetragen.</li>}
        {liste.map((v) => (
          <li key={v.id}>
            <Glass className="flex items-center justify-between gap-3 rounded-[18px] px-5 py-3">
              <span className="text-[14px]">
                <span className="font-medium">{v.benutzer}</span> · {fmt(v.von)} – {fmt(v.bis)} · vertreten durch <span className="font-medium">{v.vertreter}</span>
                {v.von <= heute && v.bis >= heute && <span className="ml-2 text-accent">aktuell</span>}
              </span>
              {v.benutzer === b.name && <VertretungEntfernen id={v.id} />}
            </Glass>
          </li>
        ))}
      </ul>
    </div>
  );
}
