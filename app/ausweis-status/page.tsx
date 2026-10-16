import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AusweisStatus } from "@/components/ausweis/AusweisStatus";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Ist mein Ausweis da?" };

export default async function AusweisStatusSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "ausweisStatus")) notFound();
  const de = (await getLang(tenant)) === "de";
  return (
    <Page titel={de ? "Ist mein Ausweis da?" : "Is my ID ready?"} intro={de ? "Personalausweis oder Reisepass beantragt? Hier sehen Sie, ob er abholbereit ist." : "Check whether your ID card or passport is ready for collection."}>
      <AusweisStatus />
    </Page>
  );
}
