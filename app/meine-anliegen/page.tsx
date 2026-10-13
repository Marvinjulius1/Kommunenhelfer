import type { Metadata } from "next";
import { MeineAnliegen } from "@/components/anliegen/MeineAnliegen";
import { Page } from "@/components/ui/Page";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Meine Anliegen" };

export default async function AnliegenSeite() {
  const lang = await getLang(await getTenant());
  return (
    <Page
      titel={lang === "de" ? "Meine Anliegen" : "My requests"}
      intro={
        lang === "de"
          ? "Der aktuelle Stand Ihrer Anträge und Termine. Die Liste wird nur auf diesem Gerät gespeichert."
          : "The current status of your applications and appointments. The list is stored only on this device."
      }
    >
      <MeineAnliegen />
    </Page>
  );
}
