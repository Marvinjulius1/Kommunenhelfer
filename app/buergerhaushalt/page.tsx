import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Haushalt } from "@/components/beteiligung/Haushalt";
import { Page } from "@/components/ui/Page";
import { haushalte, haushaltSicht } from "@/lib/beteiligung/haushalt";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Bürgerhaushalt" };
export const dynamic = "force-dynamic";

export default async function BuergerhaushaltSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "buergerhaushalt")) notFound();
  const k = await aktuellesKonto(tenant);
  const liste = (await haushalte(tenant)).map((h) => haushaltSicht(h, k));
  return (
    <Page titel="Bürgerhaushalt" intro={`Sie entscheiden mit: Verteilen Sie einen Teil des Haushalts von ${tenant.name} auf die Projekte, die Ihnen am wichtigsten sind.`} breit>
      {liste.length ? (
        <div className="space-y-10">
          {liste.map((h) => (
            <Haushalt key={h.id} start={h} />
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-muted">Zurzeit läuft kein Bürgerhaushalt.</p>
      )}
    </Page>
  );
}
