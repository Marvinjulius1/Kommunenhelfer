import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Vollmachten } from "@/components/konto/Vollmachten";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Vollmachten und Unternehmen" };
export const dynamic = "force-dynamic";

export default async function VollmachtenSeite({ searchParams }: { searchParams: Promise<{ annehmen?: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "konto")) redirect("/");
  const { annehmen } = await searchParams;
  const k = await aktuellesKonto(tenant);
  if (!k) redirect(`/konto/anmelden?weiter=${encodeURIComponent(`/konto/vollmachten${annehmen ? `?annehmen=${annehmen}` : ""}`)}`);
  return (
    <Page titel="Vollmachten und Unternehmen" intro="Erledigen Sie Anliegen für Angehörige oder Ihr Unternehmen – und lassen Sie sich selbst vertreten. Alles nachvollziehbar und jederzeit widerrufbar." breit>
      <Vollmachten annehmen={annehmen} />
    </Page>
  );
}
