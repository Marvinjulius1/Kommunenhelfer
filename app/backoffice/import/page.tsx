/** Leistungsbeschreibungen aus dem Redaktionssystem des Landes (XZuFi) übernehmen. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { LeistungsImport, UebernommeneLeistung } from "@/components/backoffice/Import";
import { Glass } from "@/components/ui/Glass";
import { ladeAnpassungen } from "@/lib/admin/anpassungen";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { basisTenant, getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ImportSeite() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "admin")) return <p className="text-[14px] text-muted">Leistungen übernehmen Benutzer mit der Rolle „admin“.</p>;
  const basis = await basisTenant(tenant.slug);
  const eigene = (await ladeAnpassungen(tenant.slug))?.eigeneLeistungen ?? [];
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Leistungen übernehmen</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        Bund und Länder pflegen Beschreibungen aller Verwaltungsleistungen zentral (FIM/LeiKa). Exportieren Sie sie aus dem Redaktionssystem Ihres Landes als XZuFi-Datei und übernehmen Sie sie hier – mit Unterlagen, Kosten, Fristen und Leistungsschlüssel. Das spart den größten Teil der Einrichtung.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Glass className="rounded-[24px] p-6">
          <LeistungsImport aemter={basis.aemter.map((a) => ({ id: a.id, name: tx(a.name, "de") }))} />
        </Glass>
        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Eigene Leistungen</h2>
          <p className="mt-1 text-[13px] text-muted">
            Übernommene Leistungen erscheinen als Info-Seite.{" "}
            {aktiv(tenant, "formularBaukasten") && (
              <>
                Einen Online-Antrag ergänzen Sie im{" "}
                <Link href="/backoffice/formulare" className="text-accent underline underline-offset-2">
                  Formular-Baukasten
                </Link>
                .
              </>
            )}
          </p>
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {eigene.length === 0 && <li className="py-3 text-[14px] text-muted">Noch keine.</li>}
            {eigene.map((l) => (
              <UebernommeneLeistung key={l.id} id={l.id} titel={tx(l.titel, "de")} onlineFormular={!!l.formular} />
            ))}
          </ul>
        </Glass>
      </div>
    </div>
  );
}
