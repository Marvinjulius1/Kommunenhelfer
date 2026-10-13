import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Antrag } from "@/components/flow/Antrag";
import { tx } from "@/lib/i18n";
import { findeLeistung, getLang, getTenant } from "@/lib/tenant";

type Params = { params: Promise<{ leistung: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tenant = await getTenant();
  const l = findeLeistung(tenant, (await params).leistung);
  return { title: l ? tx(l.titel, await getLang(tenant)) : "Antrag" };
}

export default async function AntragSeite({ params }: Params) {
  const tenant = await getTenant();
  const leistung = findeLeistung(tenant, (await params).leistung);
  if (!leistung?.online || !leistung.formular) notFound();
  return <Antrag leistung={leistung} />;
}
