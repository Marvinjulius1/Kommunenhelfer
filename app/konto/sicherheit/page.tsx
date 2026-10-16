import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sicherheit } from "@/components/konto/Sicherheit";
import { Page } from "@/components/ui/Page";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Sicherheit & Datenschutz" };
export const dynamic = "force-dynamic";

export default async function SicherheitSeite() {
  const k = await aktuellesKonto(await getTenant());
  if (!k) redirect("/konto/anmelden?weiter=/konto/sicherheit");
  return (
    <Page titel="Sicherheit & Datenschutz">
      <Sicherheit hatPasswort={!!k.passwortHash} />
    </Page>
  );
}
