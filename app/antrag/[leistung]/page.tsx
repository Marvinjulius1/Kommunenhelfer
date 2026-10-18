import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Antrag } from "@/components/flow/Antrag";
import { tx } from "@/lib/i18n";
import { findeLeistung, getLang, getTenant } from "@/lib/tenant";
import { profilVon } from "@/lib/konto/service";
import { handelndesKonto } from "@/lib/konto/vertretung";
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
  const h = await handelndesKonto(tenant, "antraege");
  let vorbelegung: Record<string, string> | undefined;
  if (h) {
    const ids = new Set(leistung.formular.schritte.flatMap((s) => s.felder.map((f) => f.id)));
    const aus = (p: ReturnType<typeof profilVon>) => Object.fromEntries(Object.entries(VORBELEGUNG).filter(([feld, quelle]) => ids.has(feld) && p[quelle]).map(([feld, quelle]) => [feld, String(p[quelle])]));
    if (h.konto.art === "organisation") {
      // Unternehmen: Ansprechperson aus dem eigenen Konto, Anschrift und Kontakt der Firma
      const firma = profilVon(h.konto);
      const ich = profilVon(h.selbst);
      vorbelegung = {
        ...aus({ ...ich, strasse: firma.strasse, plz: firma.plz, ort: firma.ort, email: firma.email, telefon: firma.telefon ?? ich.telefon, iban: undefined, kontoinhaber: undefined }),
        ...(ids.has("betriebsname") ? { betriebsname: firma.nachname } : {}),
        ...(ids.has("firma") ? { firma: firma.nachname } : {}),
      };
    } else vorbelegung = aus(profilVon(h.konto));
  }
  return <Antrag leistung={leistung} vorbelegung={vorbelegung} />;
}
