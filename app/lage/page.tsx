import type { Metadata } from "next";
import { LageAnsicht } from "@/components/krise/LageAnsicht";
import { Page } from "@/components/ui/Page";
import { aktuelleLage } from "@/lib/krise/service";
import { getLang, getTenant } from "@/lib/tenant";
import { aktiveWarnungen } from "@/lib/warnungen/service";

export const metadata: Metadata = { title: "Aktuelle Lage" };
export const dynamic = "force-dynamic";

export default async function LageSeite() {
  const tenant = await getTenant();
  const lage = await aktuelleLage(tenant);
  if (!lage)
    return (
      <Page titel="Aktuelle Lage" intro="Derzeit gibt es keine besondere Lage. Im Notfall erreichen Sie Feuerwehr und Rettungsdienst unter 112 und die Polizei unter 110.">
        <p className="text-[15px] text-muted">Hinweise und Sperrungen finden Sie unter „Aktuelles“.</p>
      </Page>
    );
  const amtlich = (await aktiveWarnungen(tenant).catch(() => [])).filter((w) => w.quelle === "nina");
  return <LageAnsicht tenant={tenant} lage={lage} amtlich={amtlich} deutschFremd={(await getLang(tenant)) !== "de"} />;
}
