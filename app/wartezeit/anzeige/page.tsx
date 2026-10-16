import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Anzeige } from "@/components/wartezeit/Anzeige";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";
import { stand, wartendeAemter } from "@/lib/wartezeit/service";

export const metadata: Metadata = { title: "Aufrufanzeige", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AnzeigeSeite({ searchParams }: { searchParams: Promise<{ amt?: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "warteschlange")) notFound();
  const start = await Promise.all(wartendeAemter(tenant).map((a) => stand(tenant, a)));
  return <Anzeige start={start} amtId={(await searchParams).amt} />;
}
