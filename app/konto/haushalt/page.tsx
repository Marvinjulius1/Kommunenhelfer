import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HaushaltFormular } from "@/components/konto/HaushaltFormular";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto, profilVon } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Mein Haushalt" };
export const dynamic = "force-dynamic";

export default async function HaushaltSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "hinweise")) redirect("/konto");
  const k = await aktuellesKonto(tenant);
  if (!k) redirect("/konto/anmelden?weiter=/konto/haushalt");
  const p = profilVon(k);
  return (
    <Page
      titel="Mein Haushalt"
      intro="Alle Angaben sind freiwillig. Wir nutzen sie nur, um Sie rechtzeitig zu erinnern – etwa an die Hundesteuer oder den Kita-Platz. Sie sind verschlüsselt gespeichert und gehen an kein Amt."
    >
      <HaushaltFormular
        start={{ kinder: p.kinder ?? [], hund: p.hund ?? false, grundbesitz: p.grundbesitz ?? false, ausweisGueltigBis: p.ausweisGueltigBis ?? "", reisepassGueltigBis: p.reisepassGueltigBis ?? "" }}
      />
    </Page>
  );
}
