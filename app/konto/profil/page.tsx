import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfilFormular } from "@/components/konto/ProfilFormular";
import { Page } from "@/components/ui/Page";
import { aktuellesKonto, profilVon } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Persönliche Daten" };
export const dynamic = "force-dynamic";

export default async function ProfilSeite() {
  const k = await aktuellesKonto(await getTenant());
  if (!k) redirect("/konto/anmelden?weiter=/konto/profil");
  const p = profilVon(k);
  // IBAN nur maskiert an den Browser
  const profil = { ...p, iban: p.iban ? `${p.iban.slice(0, 4)} •••• ${p.iban.slice(-4)}` : "" };
  return (
    <Page titel="Persönliche Daten" intro="Diese Angaben füllen Ihre Anträge automatisch aus. Sie sind verschlüsselt gespeichert und nur für Sie sichtbar.">
      <Suspense>
        <ProfilFormular profil={profil} geprueft={k.vertrauensniveau === "hoch"} />
      </Suspense>
    </Page>
  );
}
