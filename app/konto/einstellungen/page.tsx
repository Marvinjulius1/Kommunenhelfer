import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EinstellungenFormular } from "@/components/konto/EinstellungenFormular";
import { Page } from "@/components/ui/Page";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Benachrichtigungen" };
export const dynamic = "force-dynamic";

export default async function EinstellungenSeite() {
  const tenant = await getTenant();
  const k = await aktuellesKonto(tenant);
  if (!k) redirect("/konto/anmelden?weiter=/konto/einstellungen");
  return (
    <Page titel="Benachrichtigungen & Wohnort">
      <EinstellungenFormular start={k.einstellungen} bezirke={(tenant.abfall?.bezirke ?? []).map(({ id, name }) => ({ id, name }))} ortsteile={tenant.ortsteile ?? []} />
    </Page>
  );
}
