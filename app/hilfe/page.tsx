import type { Metadata } from "next";
import Link from "next/link";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page, Section } from "@/components/ui/Page";
import { deutsch, dict, tx } from "@/lib/i18n";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Hilfe" };

export default async function HilfeSeite() {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const t = dict(lang);
  const de = deutsch(lang);
  return (
    <Page titel={t.menuHilfe} intro={de ? "Antworten auf häufige Fragen und wie dieses Portal funktioniert." : "Answers to common questions and how this portal works."}>
      {tenant.faq.length > 0 && (
        <Section titel={de ? "Häufige Fragen" : "Frequently asked questions"}>
          <Glass className="divide-y divide-[var(--line)] rounded-[24px] px-6">
            {tenant.faq.map((f, i) => (
              <details key={i} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                  {tx(f.frage, lang)}
                  <Icon name="chevronDown" className="size-4 shrink-0 text-subtle transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-[15px] leading-relaxed text-muted">{tx(f.antwort, lang)}</p>
              </details>
            ))}
          </Glass>
        </Section>
      )}

      <Section titel={de ? "So funktioniert der digitale Assistent" : "How the digital assistant works"}>
        {de ? (
          <>
            <p>Beschreiben Sie Ihr Anliegen auf der Startseite in eigenen Worten. Der Assistent zeigt Ihnen, welche Unterlagen Sie brauchen, was es kostet und wie Sie es erledigen – online oder mit Termin.</p>
            <p>Der Assistent antwortet ausschließlich auf Grundlage der Informationen der {tenant.art} {tenant.name}. Ist er sich nicht sicher, sagt er das und nennt Ihnen eine Ansprechperson. Er gibt keine Rechtsberatung.</p>
            <p>Die Antworten sind eine Hilfe, aber keine verbindliche Auskunft. Verbindlich ist der Bescheid der Verwaltung.</p>
          </>
        ) : (
          <>
            <p>Describe your request on the start page in your own words. The assistant shows you which documents you need, what it costs and how to get it done – online or with an appointment.</p>
            <p>The assistant answers only on the basis of information from {tenant.name}. If it is unsure, it says so and refers you to a contact person. It does not give legal advice.</p>
          </>
        )}
      </Section>

      <Section titel={de ? "Weitere Hilfe" : "More help"}>
        <ul className="space-y-2">
          <li>
            <Link href="/leistungen" className="text-accent hover:underline">{t.alleLeistungen}</Link>
          </li>
          <li>
            <Link href="/kontakt" className="text-accent hover:underline">{t.kontaktAufnehmen}</Link>
          </li>
          <li>
            <Link href="/barrierefreiheit" className="text-accent hover:underline">{t.barrierefreiheit}</Link>
          </li>
        </ul>
      </Section>
    </Page>
  );
}
