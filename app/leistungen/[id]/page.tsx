/** Detailseite einer Leistung – vor allem für Leistungen ohne Online-Antrag (z. B. aus XZuFi übernommen). */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeistungDetails } from "@/components/home/LeistungDetails";
import { ButtonLink } from "@/components/ui/Button";
import { Page } from "@/components/ui/Page";
import { deutsch, tx } from "@/lib/i18n";
import { findeLeistung, getLang, getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const tenant = await getTenant();
  const l = findeLeistung(tenant, (await params).id);
  return { title: l ? tx(l.titel, "de") : "Leistung" };
}

export default async function LeistungSeite({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const de = deutsch(lang);
  const l = findeLeistung(tenant, (await params).id);
  if (!l?.aktiv) notFound();
  const amt = tenant.aemter.find((a) => a.id === l.amtId);
  return (
    <Page titel={tx(l.titel, lang)} intro={tx(l.kurz, lang)}>
      <div className="mb-8 flex flex-wrap gap-3">
        {l.online && l.formular && <ButtonLink href={`/antrag/${l.id}`}>{de ? "Online beantragen" : "Apply online"}</ButtonLink>}
        {l.termin && (
          <ButtonLink href={`/termine?leistung=${l.id}`} variant={l.online ? "glass" : "primary"}>
            {de ? "Termin buchen" : "Book appointment"}
          </ButtonLink>
        )}
        {l.externerLink && (
          <ButtonLink href={l.externerLink.url} variant="glass" external>
            {tx(l.externerLink.label, lang)}
          </ButtonLink>
        )}
      </div>
      {l.beschreibung && <p className="mb-8 whitespace-pre-wrap text-[16px] leading-relaxed">{tx(l.beschreibung, lang)}</p>}
      <LeistungDetails leistung={l} />
      <dl className="mt-8 space-y-3 border-t border-[var(--line)] pt-6 text-[14px]">
        {amt && (
          <div>
            <dt className="text-subtle">{de ? "Zuständig" : "Responsible"}</dt>
            <dd>
              {tx(amt.name, lang)} · {tx(amt.ort, lang)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-subtle">{de ? "Kontakt" : "Contact"}</dt>
          <dd>
            {tenant.kontakt.telefon} · {tenant.kontakt.email}
          </dd>
        </div>
        {l.rechtsgrundlage && (
          <div>
            <dt className="text-subtle">{de ? "Rechtsgrundlage" : "Legal basis"}</dt>
            <dd className="whitespace-pre-wrap">{tx(l.rechtsgrundlage, lang)}</dd>
          </div>
        )}
      </dl>
    </Page>
  );
}
