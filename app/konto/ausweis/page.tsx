import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AusweisAnmeldung } from "@/components/konto/AusweisAnmeldung";
import { Page } from "@/components/ui/Page";
import { demoModus } from "@/lib/demo";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Mit Online-Ausweis anmelden" };

export default async function AusweisSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "konto") || !aktiv(tenant, "onlineAusweis")) redirect("/konto/anmelden");
  return (
    <Page titel="Mit dem Online-Ausweis anmelden" intro="So einfach wie ein Bezahlvorgang: Ausweis ans Smartphone halten, PIN eingeben, fertig.">
      <Suspense>
        <AusweisAnmeldung testmodus={demoModus()} />
      </Suspense>
    </Page>
  );
}
