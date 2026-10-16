import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Wartezeit } from "@/components/wartezeit/Wartezeit";
import { demoModus } from "@/lib/demo";
import { aktiv } from "@/lib/funktionen";
import { getLang, getTenant } from "@/lib/tenant";
import { stand, wartendeAemter } from "@/lib/wartezeit/service";

export const metadata: Metadata = { title: "Wartezeit im Rathaus" };
export const dynamic = "force-dynamic";

export default async function WartezeitSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "warteschlange")) notFound();
  const de = (await getLang(tenant)) === "de";
  const start = await Promise.all(wartendeAemter(tenant).map((a) => stand(tenant, a)));
  return (
    <Page titel={de ? "Wartezeit im Rathaus" : "Waiting times"} intro={de ? "So lange warten Sie gerade ohne Termin – live." : "Current waiting times without an appointment – live."}>
      <Wartezeit start={start} demo={demoModus()} />
    </Page>
  );
}
