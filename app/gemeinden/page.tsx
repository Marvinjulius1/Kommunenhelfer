import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GemeindeSuche } from "@/components/home/GemeindeSuche";
import { Page } from "@/components/ui/Page";
import { portalAdresse } from "@/lib/landkreis";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Ihre Gemeinde" };

export default async function GemeindenSeite() {
  const tenant = await getTenant();
  if (!tenant.gemeinden?.length) notFound();
  return (
    <Page titel="Ihre Gemeinde" intro={`Meldeangelegenheiten, Ausweise, Hundesteuer oder Abfall erledigen Sie bei Ihrer Gemeinde. Geben Sie Postleitzahl oder Namen ein.`}>
      <GemeindeSuche gemeinden={tenant.gemeinden.map((g) => ({ name: g.name, plz: g.plz, url: g.slug ? portalAdresse(g.slug) : g.url!, portal: !!g.slug }))} />
    </Page>
  );
}
