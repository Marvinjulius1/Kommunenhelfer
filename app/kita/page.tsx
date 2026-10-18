import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitaBoerse } from "@/components/kita/KitaBoerse";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { deutsch } from "@/lib/i18n";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Kita-Platz" };

const GRUPPE = { u3: "Krippe (unter 3)", ue3: "Kindergarten (ab 3)", hort: "Hort (Schulkinder)" };

export default async function KitaSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "kita") || !tenant.kitas?.length) notFound();
  const de = deutsch(await getLang(tenant));
  return (
    <Page
      titel={de ? "Kita-Platz finden" : "Find a childcare place"}
      intro={
        de
          ? "Wählen Sie bis zu drei Wunsch-Kitas. Sie sehen jederzeit, auf welchem Platz der Warteliste Ihr Kind steht – und sagen ein Angebot mit einem Klick zu."
          : "Choose up to three preferred day-care centres and see your place on each waiting list."
      }
      breit
    >
      <KitaBoerse kitas={tenant.kitas.map(({ id, name, altersgruppen }) => ({ id, name, altersgruppen }))} />

      <h2 className="mt-14 text-[20px] font-semibold tracking-tight">{de ? "Unsere Kitas" : "Our day-care centres"}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {tenant.kitas.map((k) => (
          <li key={k.id}>
            <Glass className="h-full rounded-[24px] p-5">
              <p className="text-[16px] font-semibold">{k.name}</p>
              <p className="mt-1 text-[14px] text-muted">
                {k.traeger} · {k.adresse}
                {k.ortsteil ? ` (${k.ortsteil})` : ""}
              </p>
              <p className="mt-3 flex flex-wrap gap-1.5">
                {k.altersgruppen.map((g) => (
                  <span key={g} className="rounded-full bg-[var(--line)] px-3 py-1 text-[12px]">
                    {GRUPPE[g]}
                  </span>
                ))}
              </p>
              <dl className="mt-3 space-y-1 text-[13px] text-muted">
                {k.oeffnungszeiten && (
                  <div className="flex gap-2">
                    <dt>
                      <Icon name="clock" className="size-4" />
                      <span className="sr-only">Öffnungszeiten</span>
                    </dt>
                    <dd>{k.oeffnungszeiten}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt>
                    <Icon name="users" className="size-4" />
                    <span className="sr-only">Plätze</span>
                  </dt>
                  <dd>{k.plaetze} Plätze</dd>
                </div>
                {k.profil && <dd>{k.profil}</dd>}
              </dl>
            </Glass>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] text-subtle">
        Die Warteliste zeigt die Reihenfolge des Eingangs. Über die Vergabe entscheidet die Kita nach den Kriterien der Stadt (z. B. Geschwisterkinder, Berufstätigkeit). Der Rechtsanspruch auf einen Betreuungsplatz ab dem ersten Geburtstag bleibt davon unberührt.
      </p>
    </Page>
  );
}
