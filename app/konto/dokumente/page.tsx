import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dokumentensafe } from "@/components/konto/Dokumentensafe";
import { Page } from "@/components/ui/Page";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Dokumentensafe" };
export const dynamic = "force-dynamic";

export default async function Dokumente() {
  if (!(await aktuellesKonto(await getTenant()))) redirect("/konto/anmelden?weiter=/konto/dokumente");
  return (
    <Page titel="Dokumentensafe">
      <Dokumentensafe />
    </Page>
  );
}
