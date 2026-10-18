import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KurzFormular } from "@/components/dienste/KurzFormular";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";
import { ehrenamt } from "@/lib/veranstaltungen/service";

export const metadata: Metadata = { title: "Ehrenamt" };
export const dynamic = "force-dynamic";

export default async function EhrenamtSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "ehrenamt")) notFound();
  const liste = await ehrenamt(tenant);
  return (
    <Page titel="Ehrenamt" intro="Mit anpacken – ob zwei Stunden beim Stadtfest oder regelmäßig. Hier suchen Vereine, Schulen und die Stadt Unterstützung.">
      {!liste.length && <p className="text-[15px] text-muted">Zurzeit gibt es keine Gesuche.</p>}
      <ul className="space-y-4">
        {liste.map((e) => (
          <li key={e.id}>
            <Glass className="rounded-[24px] p-6">
              <p className="text-[13px] text-subtle">
                {e.kategorie} · {e.organisation}
              </p>
              <h2 className="mt-1 text-[18px] font-semibold">{e.titel}</h2>
              <p className="mt-2 text-[15px] leading-relaxed">{e.text}</p>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location" className="size-4" />
                  {e.ort}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="clock" className="size-4" />
                  {e.zeit}
                </span>
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-[15px] font-medium text-accent">Ich helfe mit</summary>
                <div className="mt-4">
                  <KurzFormular
                    endpoint="/api/ehrenamt"
                    basis={{ ehrenamtId: e.id }}
                    felder={["telefon", "text"]}
                    textLabel="Ein paar Worte zu Ihnen (wann können Sie, was bringen Sie mit?)"
                    knopf="Nachricht senden"
                    erfolg={`Danke! Ihre Nachricht ist bei ${e.organisation}. Man meldet sich direkt bei Ihnen.`}
                    zweck="zur Weitergabe an die suchende Organisation (Löschung im Portal nach 90 Tagen)"
                  />
                </div>
              </details>
            </Glass>
          </li>
        ))}
      </ul>
    </Page>
  );
}
