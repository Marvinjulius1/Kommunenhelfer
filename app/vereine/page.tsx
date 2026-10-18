import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KurzFormular } from "@/components/dienste/KurzFormular";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Vereine" };

export default async function VereineSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "veranstaltungen") || !tenant.vereine?.length) notFound();
  const kategorien = [...new Set(tenant.vereine.map((v) => v.kategorie))].sort((a, b) => a.localeCompare(b, "de"));
  return (
    <Page titel="Vereine" intro={`Sport, Kultur, Musik und Soziales – das Vereinsleben in ${tenant.name}. Schreiben Sie einem Verein direkt über das Portal.`} breit>
      {kategorien.map((k) => (
        <section key={k} className="mt-10 first:mt-0">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">{k}</h2>
          <ul className="space-y-3">
            {tenant.vereine!
              .filter((v) => v.kategorie === k)
              .map((v) => (
                <li key={v.id}>
                  <Glass className="rounded-[24px] p-5">
                    <p className="text-[16px] font-semibold">{v.name}</p>
                    <p className="mt-1 text-[14px] text-muted">{v.kurz}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-[14px]">
                      {v.web && (
                        <a href={v.web} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline underline-offset-4">
                          Website <Icon name="external" className="size-3.5" />
                        </a>
                      )}
                    </div>
                    {v.kontaktEmail && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-[14px] font-medium text-accent">Nachricht schreiben</summary>
                        <div className="mt-4">
                          <KurzFormular endpoint="/api/vereine" basis={{ vereinId: v.id }} felder={["text"]} knopf="Senden" erfolg="Ihre Nachricht ist beim Verein. Man antwortet Ihnen direkt per E-Mail." zweck="zur Weiterleitung an den Verein" />
                        </div>
                      </details>
                    )}
                  </Glass>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
