import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Verwarnung } from "@/components/parken/Verwarnung";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { demoModus } from "@/lib/demo";
import { aktiv } from "@/lib/funktionen";
import { DEMO_FALL } from "@/lib/parken/service";
import { findeLeistung, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Parken und Verwarnungsgeld" };

export default async function ParkenSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "parken")) notFound();
  const ausweis = findeLeistung(tenant, "bewohnerparkausweis");
  const halteverbot = findeLeistung(tenant, "halteverbot");
  return (
    <Page titel="Parken" intro="Verwarnungsgeld bezahlen oder Stellung nehmen, Bewohnerparkausweis beantragen, Parkplätze finden.">
      <section aria-labelledby="h-vg">
        <h2 id="h-vg" className="mb-3 text-[20px] font-semibold tracking-tight">
          Verwarnungsgeld
        </h2>
        <p className="mb-4 text-[15px] text-muted">Aktenzeichen und Kennzeichen stehen auf dem Zettel an Ihrer Windschutzscheibe oder im Brief.</p>
        <Verwarnung />
        {demoModus() && (
          <p className="mt-3 text-[13px] text-subtle">
            Demo: Aktenzeichen {DEMO_FALL.aktenzeichen}, Kennzeichen {DEMO_FALL.kennzeichen}
          </p>
        )}
      </section>
      <ul className="mt-12 grid gap-3 sm:grid-cols-2">
        {[
          ...(ausweis ? [{ href: `/antrag/${ausweis.id}`, icon: "card" as const, titel: "Bewohnerparkausweis", text: "Online beantragen oder verlängern" }] : []),
          ...(halteverbot ? [{ href: `/antrag/${halteverbot.id}`, icon: "alert" as const, titel: "Halteverbot für den Umzug", text: "Haltverbotszone beantragen" }] : []),
          ...(aktiv(tenant, "karte") && tenant.karte ? [{ href: "/karte?zeige=parken", icon: "pin" as const, titel: "Parkplätze und Ladesäulen", text: "Auf der Stadtkarte" }] : []),
        ].map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="glass pressable flex h-full items-start gap-4 rounded-[24px] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                <Icon name={d.icon} className="size-5" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">{d.titel}</span>
                <span className="mt-1 block text-[14px] text-muted">{d.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Glass className="mt-10 rounded-[24px] p-5 text-[13px] leading-relaxed text-muted">
        Ihr Kennzeichen speichern wir nur als verschlüsselten Prüfwert. Wenn Sie innerhalb von einer Woche zahlen, ist die Sache erledigt. Sie können stattdessen auch Stellung nehmen – dann prüft das Ordnungsamt den Fall.
      </Glass>
    </Page>
  );
}
