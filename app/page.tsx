import { Home } from "@/components/home/Home";
import { LageAnsicht } from "@/components/krise/LageAnsicht";
import { aktuelleLage } from "@/lib/krise/service";
import { getLang, getTenant } from "@/lib/tenant";
import { aktiveWarnungen } from "@/lib/warnungen/service";

export const dynamic = "force-dynamic";

export default async function Startseite({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const tenant = await getTenant();
  // Krisenmodus: Startseite wird zur Lage-Seite – das Portal bleibt einen Klick entfernt
  const lage = (await searchParams).portal ? undefined : await aktuelleLage(tenant);
  if (!lage) return <Home />;
  const amtlich = (await aktiveWarnungen(tenant).catch(() => [])).filter((w) => w.quelle === "nina");
  return <LageAnsicht tenant={tenant} lage={lage} amtlich={amtlich} startseite deutschFremd={(await getLang(tenant)) !== "de"} />;
}
