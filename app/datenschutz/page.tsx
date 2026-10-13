import type { Metadata } from "next";
import { Page, Section } from "@/components/ui/Page";
import { tx } from "@/lib/i18n";
import { aktiveLeistungen, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Datenschutz" };

/**
 * Datenschutzhinweise für das Online-Portal (Art. 13 DSGVO).
 * VORLAGE – vor dem Produktivbetrieb von der/dem Datenschutzbeauftragten
 * der Gemeinde prüfen und ergänzen lassen.
 */
export default async function DatenschutzSeite() {
  const tenant = await getTenant();
  const provider = process.env.ASSISTANT_PROVIDER ?? "local";
  const extern = provider !== "local";
  const fristen = aktiveLeistungen(tenant).filter((l) => l.formular);

  return (
    <Page
      titel="Datenschutz im Online-Portal"
      intro={`Diese Hinweise ergänzen die allgemeine Datenschutzerklärung der ${tenant.art} ${tenant.name}.`}
    >
      <Section titel="Verantwortliche Stelle">
        <p>{tenant.rechtliches.verantwortlich}</p>
        <p>Datenschutzbeauftragte Stelle: {tenant.rechtliches.datenschutzbeauftragter}</p>
        <p>
          Allgemeine Datenschutzerklärung:{" "}
          <a href={tenant.rechtliches.datenschutzUrl} className="text-accent underline underline-offset-2" rel="noopener">
            {tenant.rechtliches.datenschutzUrl.replace(/^https?:\/\//, "")}
          </a>
        </p>
      </Section>

      <Section titel="Grundsätze">
        <p>Wir erheben nur die Daten, die für Ihr Anliegen erforderlich sind. Dieses Portal verwendet keine Analyse- oder Werbe-Tracker, keine Cookies von Drittanbietern und lädt keine externen Schriften oder Skripte. Das Portal wird in Rechenzentren in der Europäischen Union betrieben.</p>
      </Section>

      <Section titel="Der digitale Assistent" id="assistent">
        <p>
          Auf der Startseite können Sie Ihr Anliegen in eigenen Worten beschreiben. Der Assistent ist ein KI-System (Hinweis nach Art. 50 KI-Verordnung). Er antwortet ausschließlich auf Grundlage der von der {tenant.art} {tenant.name} hinterlegten Informationen und trifft keine Entscheidungen über Ihre Anträge.
        </p>
        <p>Der Gesprächsverlauf wird nicht auf unseren Servern gespeichert. Er bleibt nur in Ihrem Browser, bis Sie den Tab schließen.</p>
        {extern ? (
          <p>
            Zur Formulierung der Antworten wird ein Sprachmodell eines Auftragsverarbeiters genutzt. Vor der Übermittlung entfernen wir automatisch erkennbare personenbezogene Angaben wie E-Mail-Adressen, Telefonnummern, IBAN und Geburtsdaten. Die Eingaben werden nicht zum Training des Modells verwendet. Bitte geben Sie im Gespräch keine sensiblen Daten (z. B. Gesundheitsdaten) ein.
          </p>
        ) : (
          <p>Die Antworten werden direkt auf unserem Server aus den hinterlegten Informationen erzeugt. Ihre Eingaben werden dabei nicht an Dritte übermittelt.</p>
        )}
        <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. e DSGVO in Verbindung mit dem Onlinezugangsgesetz (OZG).</p>
      </Section>

      <Section titel="Online-Anträge">
        <p>Ihre Angaben werden verschlüsselt übertragen (TLS) und verschlüsselt gespeichert (AES-256). Sie werden ausschließlich zur Bearbeitung Ihres Antrags verwendet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c und e DSGVO in Verbindung mit dem jeweiligen Fachrecht.</p>
        <p>Speicherdauer im Portal (danach automatische Löschung; die Aufbewahrung in der Fachakte richtet sich nach den gesetzlichen Fristen):</p>
        <ul className="prose-calm">
          {fristen.map((l) => (
            <li key={l.id}>
              {tx(l.titel, "de")}: {l.formular!.aufbewahrungTage} Tage
            </li>
          ))}
        </ul>
      </Section>

      <Section titel="Terminbuchung">
        <p>Für die Terminvergabe verarbeiten wir Ihren Namen, Ihre E-Mail-Adresse und – freiwillig – Hinweise zu Unterstützungsbedarf. Die Daten werden 14 Tage nach dem Termin gelöscht. Rechtsgrundlage: Art. 6 Abs. 1 lit. a und e DSGVO.</p>
      </Section>

      <Section titel="Speicherung auf Ihrem Gerät">
        <p>Wir speichern ausschließlich technisch notwendige Einstellungen auf Ihrem Gerät (§ 25 Abs. 2 TDDDG): Ihr gewähltes Erscheinungsbild (hell/dunkel), Ihre Sprache und – damit Sie den Stand Ihrer Anliegen sehen können – Vorgangsnummern mit einem Zugangscode. Sie können diese Daten jederzeit über die Einstellungen Ihres Browsers löschen.</p>
      </Section>

      <Section titel="Ihre Rechte">
        <p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Widerspruch (Art. 21) sowie das Recht, eine erteilte Einwilligung jederzeit zu widerrufen. Sie können sich bei der zuständigen Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO).</p>
      </Section>
    </Page>
  );
}
