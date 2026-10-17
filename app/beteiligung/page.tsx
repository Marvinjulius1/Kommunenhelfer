import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ideen } from "@/components/beteiligung/Ideen";
import { Umfrage } from "@/components/beteiligung/Umfrage";
import { Page } from "@/components/ui/Page";
import { IDEE_KATEGORIEN, ideen, ideeSicht, umfragen, umfrageSicht } from "@/lib/beteiligung/service";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Mitmachen" };
export const dynamic = "force-dynamic";

export default async function BeteiligungSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "beteiligung")) notFound();
  const de = (await getLang(tenant)) === "de";
  const k = await aktuellesKonto(tenant);
  const u = (await umfragen(tenant)).map((x) => umfrageSicht(x, k));
  const i = (await ideen(tenant, k)).map((x) => ideeSicht(x, k));
  return (
    <Page titel={de ? "Mitmachen" : "Get involved"} intro={de ? `Sagen Sie Ihre Meinung und bringen Sie Ideen für ${tenant.name} ein.` : `Share your opinion and ideas.`}>
      <section aria-labelledby="h-umfragen">
        <h2 id="h-umfragen" className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">
          {de ? "Umfragen" : "Surveys"}
        </h2>
        {u.length ? (
          <div className="space-y-4">
            {u.map((x) => (
              <Umfrage key={x.id} start={x} />
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-muted">{de ? "Zurzeit läuft keine Umfrage." : "No surveys at the moment."}</p>
        )}
      </section>
      <section aria-labelledby="h-ideen" className="mt-12">
        <h2 id="h-ideen" className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">
          {de ? "Ideen für unsere Stadt" : "Ideas"}
        </h2>
        <Ideen start={i} kategorien={IDEE_KATEGORIEN} ortsteile={tenant.ortsteile ?? []} />
      </section>
      {aktiv(tenant, "ratsinfo") && tenant.ratsinfo && (
        <p className="mt-12 text-[14px] text-muted">
          {de ? "Was der Rat berät und beschließt: " : "What the council decides: "}
          <Link href="/ratsinfo" className="font-medium text-accent underline underline-offset-4">
            {de ? "Rat und Ausschüsse" : "Council"}
          </Link>
        </p>
      )}
    </Page>
  );
}
