import type { Metadata } from "next";
import { Page, Section } from "@/components/ui/Page";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Barrierefreiheit" };

/**
 * Erklärung zur Barrierefreiheit (BITV 2.0 / EU-Richtlinie 2016/2102).
 * VORLAGE – nach einer Prüfung (z. B. BITV-Test) den Stand anpassen.
 */
export default async function BarrierefreiheitSeite() {
  const tenant = await getTenant();
  return (
    <Page titel="Erklärung zur Barrierefreiheit" intro={`Die ${tenant.art} ${tenant.name} ist bemüht, dieses Online-Portal barrierefrei zugänglich zu machen.`}>
      <Section titel="Stand der Vereinbarkeit">
        <p>Dieses Portal wurde nach den Anforderungen der WCAG 2.1 auf Konformitätsstufe AA bzw. der BITV 2.0 entwickelt. Eine abschließende Prüfung durch eine unabhängige Stelle steht noch aus. Das Portal ist daher derzeit als „teilweise vereinbar“ einzustufen.</p>
      </Section>
      <Section titel="Was wir umgesetzt haben">
        <ul className="prose-calm">
          <li>Vollständige Bedienung mit der Tastatur und gut sichtbare Fokus-Markierungen</li>
          <li>Unterstützung von Screenreadern durch semantische Struktur, Beschriftungen und Live-Bereiche</li>
          <li>Kontraste von mindestens 4,5:1 für Texte im hellen und dunklen Erscheinungsbild</li>
          <li>Berücksichtigung der Systemeinstellungen „Bewegung reduzieren“, „Transparenz reduzieren“ und Kontrastmodus</li>
          <li>Verständliche Fehlermeldungen in Formularen mit Sprungmarken zum betroffenen Feld</li>
          <li>Vergrößerung bis 200 % ohne Verlust von Inhalten</li>
        </ul>
      </Section>
      <Section titel="Barriere melden">
        <p>
          Sind Ihnen Mängel beim barrierefreien Zugang aufgefallen? Schreiben Sie uns:{" "}
          <a href={`mailto:${tenant.rechtliches.barrierefreiheitKontakt}`} className="text-accent underline underline-offset-2">
            {tenant.rechtliches.barrierefreiheitKontakt}
          </a>
        </p>
      </Section>
      <Section titel="Schlichtungsverfahren">
        <p>Wenn Sie auf Ihre Meldung keine zufriedenstellende Antwort erhalten, können Sie sich an die Schlichtungs- bzw. Durchsetzungsstelle Ihres Bundeslandes für barrierefreie Informationstechnik wenden.</p>
      </Section>
    </Page>
  );
}
