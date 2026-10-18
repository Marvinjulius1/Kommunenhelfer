import { redirect } from "next/navigation";
import { FormularBaukasten } from "@/components/backoffice/FormularBaukasten";
import { ladeAnpassungen } from "@/lib/admin/anpassungen";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { zuBau } from "@/lib/formulare/baukasten";
import { tx } from "@/lib/i18n";
import { getTenant, getTenantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function FormulareSeite() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "admin")) return <p className="text-[14px] text-muted">Formulare verwalten Benutzer mit der Rolle „admin“.</p>;
  const basis = getTenantBySlug(tenant.slug);
  const eigene = (await ladeAnpassungen(tenant.slug))?.eigeneLeistungen ?? [];
  const vorlagen = basis.leistungen
    .filter((l) => l.formular)
    .map((l) => ({ id: l.id, titel: tx(l.titel, "de"), bau: { ...zuBau(l), id: undefined, aktiv: false } }))
    .sort((x, y) => x.titel.localeCompare(y.titel, "de"));
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Formulare</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        Eigene Online-Anträge ohne Programmierung: Schritte und Felder zusammenstellen, in der Vorschau prüfen, veröffentlichen. Kontaktangaben, Eingangsbestätigung, „Meine Anliegen“ und das Backoffice sind automatisch dabei.
      </p>
      <div className="mt-8">
        <FormularBaukasten
          eigene={eigene.map((l) => ({ id: l.id, titel: tx(l.titel, "de"), aktiv: l.aktiv, bau: zuBau(l) }))}
          vorlagen={vorlagen}
          aemter={basis.aemter.map((a) => ({ id: a.id, name: tx(a.name, "de") }))}
        />
      </div>
    </div>
  );
}
