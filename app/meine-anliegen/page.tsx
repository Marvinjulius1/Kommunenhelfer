import type { Metadata } from "next";
import { MeineAnliegen } from "@/components/anliegen/MeineAnliegen";
import { Page } from "@/components/ui/Page";
import { aktuellesKonto } from "@/lib/konto/service";
import { getLang, getTenant } from "@/lib/tenant";
import { deutsch } from "@/lib/i18n";

export const metadata: Metadata = { title: "Meine Anliegen" };

export default async function AnliegenSeite() {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const konto = await aktuellesKonto(tenant);
  const de = deutsch(lang);
  return (
    <Page
      titel={de ? "Meine Anliegen" : "My requests"}
      intro={
        konto
          ? de
            ? "Der aktuelle Stand Ihrer Anträge und Termine – auf jedem Gerät, auf dem Sie angemeldet sind."
            : "The current status of your applications and appointments – on every device you are signed in on."
          : de
            ? "Der aktuelle Stand Ihrer Anträge und Termine. Ohne Bürgerkonto wird die Liste nur auf diesem Gerät gespeichert."
            : "The current status of your applications and appointments. Without an account, the list is stored only on this device."
      }
    >
      <MeineAnliegen />
    </Page>
  );
}
