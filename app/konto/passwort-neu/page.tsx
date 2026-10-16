import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswortNeu } from "@/components/konto/PasswortNeu";
import { Page } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Neues Passwort" };

export default function PasswortNeuSeite() {
  return (
    <Page titel="Neues Passwort">
      <Suspense>
        <PasswortNeu />
      </Suspense>
    </Page>
  );
}
