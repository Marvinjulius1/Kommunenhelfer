import type { Metadata } from "next";
import { Page } from "@/components/ui/Page";
import { WarteTicket } from "@/components/wartezeit/WarteTicket";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Ihre Wartenummer", robots: { index: false } };

export default async function TicketSeite({ params }: { params: Promise<{ id: string }> }) {
  const de = (await getLang(await getTenant())) === "de";
  return (
    <Page titel={de ? "Ihre Wartenummer" : "Your number"}>
      <WarteTicket id={(await params).id} />
    </Page>
  );
}
