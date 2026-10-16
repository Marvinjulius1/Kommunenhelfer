import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LebenslageCheckliste } from "@/components/lebenslagen/LebenslageCheckliste";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { aktuellesKonto } from "@/lib/konto/service";
import { checklistenVon, checklisteSicht, inhalt, lebenslage, schritte } from "@/lib/lebenslagen/service";
import { getLang, getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ll = lebenslage(await getTenant(), (await params).id);
  return { title: ll ? tx(ll.titel, "de") : "Lebenslage" };
}

export default async function LebenslageSeite({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenant();
  const ll = lebenslage(tenant, (await params).id);
  if (!aktiv(tenant, "lebenslagen") || !ll) notFound();
  const lang = await getLang(tenant);
  const k = await aktuellesKonto(tenant);
  const gespeichert = k ? (await checklistenVon(k)).find((c) => inhalt(c).lebenslageId === ll.id) : undefined;
  return (
    <Page titel={tx(ll.titel, lang)} intro={tx(ll.kurz, lang)}>
      <LebenslageCheckliste
        lebenslageId={ll.id}
        stichtagLabel={tx(ll.stichtag, lang)}
        vorlage={schritte(tenant, ll, undefined, [], lang)}
        relativ={Object.fromEntries(ll.schritte.filter((s) => s.tage !== undefined).map((s) => [s.id, s.tage!]))}
        gespeichert={gespeichert ? checklisteSicht(tenant, gespeichert) : undefined}
      />
    </Page>
  );
}
