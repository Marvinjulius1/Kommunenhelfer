import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Anmeldung } from "@/components/konto/Anmeldung";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Anmelden" };

export default async function AnmeldenSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "konto")) redirect("/");
  if (await aktuellesKonto(tenant)) redirect("/konto");
  return (
    <Page titel="Ihr Bürgerkonto" intro="Alle Anliegen, Termine, Bescheide und Zahlungen an einem Ort – auf jedem Gerät. Formulare füllen sich mit Ihren Daten von selbst aus.">
      <Suspense>
        <Anmeldung />
      </Suspense>
    </Page>
  );
}
