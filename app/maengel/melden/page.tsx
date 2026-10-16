import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MangelMelden } from "@/components/maengel/MangelMelden";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Mangel melden" };

export default async function MangelMeldenSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "maengelmelder") || !tenant.maengel) notFound();
  const de = (await getLang(tenant)) === "de";
  return (
    <Page titel={de ? "Mangel melden" : "Report an issue"} intro={de ? "Schlagloch, kaputte Laterne, wilder Müll? Sagen Sie uns Bescheid – in einer Minute." : "Pothole, broken street light, illegal dumping? Let us know in a minute."}>
      <MangelMelden />
    </Page>
  );
}
