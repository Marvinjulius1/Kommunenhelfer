import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AbfallKalender } from "@/components/abfall/AbfallKalender";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { getLang, getTenant } from "@/lib/tenant";
import { deutsch } from "@/lib/i18n";

export const metadata: Metadata = { title: "Abfallkalender" };
export const dynamic = "force-dynamic";

export default async function AbfallSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "abfall") || !tenant.abfall) notFound();
  const lang = await getLang(tenant);
  const k = await aktuellesKonto(tenant);
  const de = deutsch(lang);
  return (
    <Page titel={de ? "Abfallkalender" : "Waste collection"} intro={de ? "Wann wird bei Ihnen abgeholt? Straße eingeben – fertig." : "When is your collection? Enter your street."}>
      <AbfallKalender start={k ? { bezirk: k.einstellungen.abfallBezirk, erinnerung: k.einstellungen.abfallErinnerung } : null} />
    </Page>
  );
}
