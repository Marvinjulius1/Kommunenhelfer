import type { Metadata } from "next";
import Link from "next/link";
import { MeldungenAbo } from "@/components/aktuelles/MeldungenAbo";
import { Glass } from "@/components/ui/Glass";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { aktuelleMeldungen } from "@/lib/meldungen/service";
import { aktiveWarnungen } from "@/lib/warnungen/service";
import { getLang, getTenant } from "@/lib/tenant";
import { deutsch } from "@/lib/i18n";

export const metadata: Metadata = { title: "Aktuelles" };
export const dynamic = "force-dynamic";

export default async function AktuellesSeite({ searchParams }: { searchParams: Promise<{ ortsteil?: string }> }) {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const de = deutsch(lang);
  const k = await aktuellesKonto(tenant);
  const wunsch = (await searchParams).ortsteil;
  const ortsteil = tenant.ortsteile?.includes(wunsch ?? "") ? wunsch : wunsch === "alle" ? undefined : k?.einstellungen.ortsteil;
  const liste = await aktuelleMeldungen(tenant, ortsteil);
  const amtlich = (await aktiveWarnungen(tenant, ortsteil)).filter((w) => w.quelle === "nina");
  const fmt = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  return (
    <Page titel={de ? "Aktuelles" : "News"} intro={de ? "Sperrungen, Störungen und Hinweise Ihrer Verwaltung." : "Closures, disruptions and notices from your administration."}>
      {!!tenant.ortsteile?.length && (
        <nav aria-label={de ? "Ortsteil wählen" : "Choose district"} className="-mx-1 mb-6 flex flex-wrap gap-2">
          {[undefined, ...tenant.ortsteile].map((o) => {
            const an = o === ortsteil;
            return (
              <Link
                key={o ?? "alle"}
                href={`/aktuelles?ortsteil=${encodeURIComponent(o ?? "alle")}`}
                aria-current={an ? "page" : undefined}
                className={`pressable rounded-full border px-4 py-2 text-[14px] ${an ? "border-fg font-medium" : "border-[var(--line)] text-muted"}`}
              >
                {o ?? (de ? "Ganze Gemeinde" : "Everywhere")}
              </Link>
            );
          })}
        </nav>
      )}
      {amtlich.length > 0 && (
        <ul className="mb-6 space-y-3" aria-label={de ? "Amtliche Warnungen" : "Official warnings"}>
          {amtlich.map((w) => (
            <li key={w.id}>
              <Glass className={`rounded-[24px] border-2 p-6 ${w.stufe === "gefahr" ? "border-[#b42318]" : "border-[#dc9a00]"}`}>
                <p className="text-[13px] font-medium text-subtle">{de ? "Amtliche Warnung (NINA)" : "Official warning (NINA)"}</p>
                <h2 className="mt-1 text-[17px] font-semibold">{w.titel}</h2>
                <a href="https://warnung.bund.de" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[14px] text-accent underline underline-offset-4">
                  {de ? "Einzelheiten auf warnung.bund.de" : "Details at warnung.bund.de"}
                </a>
              </Glass>
            </li>
          ))}
        </ul>
      )}
      {liste.length === 0 ? (
        <p className="text-[15px] text-muted">{de ? "Zurzeit gibt es keine Meldungen." : "There are no notices at the moment."}</p>
      ) : (
        <ul className="space-y-3">
          {liste.map((m) => (
            <li key={m.id}>
              <Glass className="rounded-[24px] p-6">
                <h2 className="text-[17px] font-semibold">
                  {m.stufe === "gefahr" ? <span className="mr-2 text-danger">{de ? "Gefahr:" : "Danger:"}</span> : m.stufe === "warnung" ? <span className="mr-2 text-danger">{de ? "Warnung:" : "Warning:"}</span> : m.wichtig && <span className="mr-2 text-danger">{de ? "Wichtig:" : "Important:"}</span>}
                  {m.titel}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{m.text}</p>
                <p className="mt-3 text-[13px] text-subtle">
                  {m.ortsteil ?? (de ? "Ganze Gemeinde" : "Everywhere")} · {fmt.format(new Date(m.erstelltAm))}
                </p>
              </Glass>
            </li>
          ))}
        </ul>
      )}
      {aktiv(tenant, "push") && (
        <div className="mt-10">
          <MeldungenAbo ortsteil={ortsteil} />
        </div>
      )}
    </Page>
  );
}
