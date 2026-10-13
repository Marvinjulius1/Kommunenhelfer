import type { Metadata } from "next";
import { OeffnungszeitenTabelle } from "@/components/OeffnungszeitenTabelle";
import { ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { dict, tx } from "@/lib/i18n";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Kontakt" };

export default async function KontaktSeite() {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const t = dict(lang);
  const k = tenant.kontakt;
  const de = lang === "de";
  return (
    <Page titel={t.menuKontakt} intro={de ? "Wir sind gern persönlich für Sie da." : "We are happy to help you in person."} breit>
      <div className="grid gap-4 md:grid-cols-2">
        <Glass className="rounded-[26px] p-6">
          <h2 className="text-[19px] font-semibold">{tx(k.bezeichnung, lang)}</h2>
          <address className="mt-4 space-y-3 text-[15px] not-italic">
            <p className="flex gap-3">
              <Icon name="location" className="mt-0.5 size-5 shrink-0 text-subtle" />
              <span>
                {k.strasse}
                <br />
                {k.plz} {k.ort}
              </span>
            </p>
            {k.telefon && (
              <p className="flex gap-3">
                <Icon name="phone" className="mt-0.5 size-5 shrink-0 text-subtle" />
                <a href={`tel:${k.telefon.replace(/[^+\d]/g, "")}`} className="text-accent hover:underline">
                  {k.telefon}
                </a>
              </p>
            )}
            {k.email && (
              <p className="flex gap-3">
                <Icon name="mail" className="mt-0.5 size-5 shrink-0 text-subtle" />
                <a href={`mailto:${k.email}`} className="break-all text-accent hover:underline">
                  {k.email}
                </a>
              </p>
            )}
          </address>
          {k.hinweis && <p className="mt-5 text-[14px] leading-relaxed text-muted">{tx(k.hinweis, lang)}</p>}
          <div className="mt-6">
            <ButtonLink href="/termine">
              <Icon name="calendar" className="size-4" />
              {t.terminBuchen}
            </ButtonLink>
          </div>
        </Glass>
        <Glass className="rounded-[26px] p-6">
          <h2 className="mb-2 text-[19px] font-semibold">{t.oeffnungszeiten}</h2>
          <OeffnungszeitenTabelle plan={tenant.oeffnungszeiten} lang={lang} />
          {tenant.oeffnungszeitenHinweis && <p className="mt-4 text-[14px] text-muted">{tx(tenant.oeffnungszeitenHinweis, lang)}</p>}
        </Glass>
      </div>

      <h2 className="mb-4 mt-12 text-[20px] font-semibold">{de ? "Ämter" : "Offices"}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tenant.aemter.map((a) => (
          <li key={a.id}>
            <Glass className="rounded-[22px] p-5">
              <p className="font-medium">{tx(a.name, lang)}</p>
              <p className="mt-1 text-[14px] text-muted">{tx(a.ort, lang)}</p>
            </Glass>
          </li>
        ))}
      </ul>
    </Page>
  );
}
