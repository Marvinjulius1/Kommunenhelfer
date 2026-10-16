import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Antrag } from "@/components/flow/Antrag";
import { tx } from "@/lib/i18n";
import { findeLeistung, getLang, getTenant } from "@/lib/tenant";
import { aktuellesKonto, profilVon } from "@/lib/konto/service";
import { VORBELEGUNG } from "@/lib/konto/types";

type Params = { params: Promise<{ leistung: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tenant = await getTenant();
  const l = findeLeistung(tenant, (await params).leistung);
  return { title: l ? tx(l.titel, await getLang(tenant)) : "Antrag" };
}

export const dynamic = "force-dynamic";

export default async function AntragSeite({ params }: Params) {
  const tenant = await getTenant();
  const leistung = findeLeistung(tenant, (await params).leistung);
  if (!leistung?.online || !leistung.formular) notFound();
  // Angemeldet? Dann Formular mit den Profildaten vorbelegen.
  const konto = await aktuellesKonto(tenant);
  let vorbelegung: Record<string, string> | undefined;
  if (konto) {
    const p = profilVon(konto);
    const ids = new Set(leistung.formular.schritte.flatMap((s) => s.felder.map((f) => f.id)));
    vorbelegung = Object.fromEntries(Object.entries(VORBELEGUNG).filter(([feld, quelle]) => ids.has(feld) && p[quelle]).map(([feld, quelle]) => [feld, String(p[quelle])]));
  }
  return <Antrag leistung={leistung} vorbelegung={vorbelegung} />;
}
