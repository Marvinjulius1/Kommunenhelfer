import type { Metadata } from "next";
import { Abmelden } from "@/components/dienste/Abmelden";
import { Page } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Von Veranstaltung abmelden", robots: { index: false } };

export default async function AbmeldenSeite({ searchParams }: { searchParams: Promise<{ id?: string; c?: string }> }) {
  const { id = "", c = "" } = await searchParams;
  return (
    <Page titel="Abmelden" intro="Schade, dass Sie nicht kommen können. Mit der Abmeldung geben Sie Ihren Platz für jemanden von der Warteliste frei.">
      <Abmelden id={id} code={c} />
    </Page>
  );
}
