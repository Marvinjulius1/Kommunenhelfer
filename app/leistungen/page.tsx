import type { Metadata } from "next";
import Link from "next/link";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { dict, tx } from "@/lib/i18n";
import { aktiveLeistungen, getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Leistungen A–Z" };

/** Alle Leistungen alphabetisch – orientiert an Aufgaben, nicht an der Behördenstruktur. */
export default async function LeistungenSeite() {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const t = dict(lang);
  const de = lang === "de";
  const liste = aktiveLeistungen(tenant).sort((a, b) => tx(a.titel, lang).localeCompare(tx(b.titel, lang), lang));
  return (
    <Page titel={t.alleLeistungen} intro={de ? "Was möchten Sie erledigen?" : "What would you like to do?"}>
      <ul className="space-y-3">
        {liste.map((l) => {
          const href = l.online && l.formular ? `/antrag/${l.id}` : l.termin ? `/termine?leistung=${l.id}` : "/kontakt";
          return (
            <li key={l.id}>
              <Link href={href} className="block rounded-[22px]">
                <Glass interactive className="flex items-center justify-between gap-4 rounded-[22px] p-5">
                  <span>
                    <span className="block text-[17px] font-medium">{tx(l.titel, lang)}</span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-muted">{tx(l.kurz, lang)}</span>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-subtle">
                      <Icon name={l.online && l.formular ? "doc" : "calendar"} className="size-3.5" />
                      {l.online && l.formular ? t.onlineBeantragen : l.termin ? t.terminBuchen : t.kontaktAufnehmen}
                    </span>
                  </span>
                  <Icon name="chevronRight" className="size-4 shrink-0 text-subtle" />
                </Glass>
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
