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

      <Section titel="Bürgerkonto" id="konto">
        <p>
          Mit einem Bürgerkonto sehen Sie Ihre Anliegen, Termine, Bescheide und Zahlungen auf jedem Gerät, und Ihre Angaben werden in Formulare übernommen. Wir speichern Name, Kontaktdaten und – freiwillig – Anschrift, Bankverbindung und Angaben zu Ihrem Ausweis.
          Alle Profildaten sind verschlüsselt; Ihre E-Mail-Adresse speichern wir zum Auffinden des Kontos nur als nicht umkehrbaren Prüfwert. Passwörter werden ausschließlich als scrypt-Hash gespeichert.
        </p>
        <p>
          Bei der Anmeldung mit dem Online-Ausweis erhalten wir über die BundID nur Name, Geburtsdatum, Anschrift und ein Pseudonym. Ihr Konto wird 3 Jahre nach der letzten Anmeldung automatisch gelöscht. Sie können es jederzeit selbst löschen und alle
          Daten herunterladen (Bereich „Sicherheit & Datenschutz“). Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 3 OZG.
        </p>
      </Section>

      <Section titel="Hochgeladene Unterlagen" id="uploads">
        <p>
          Sie können im Assistenten Unterlagen hochladen (PDF, JPG, PNG, HEIC). Bevor Sie das erste Mal hochladen, bitten wir Sie um Ihre Einwilligung. Die Dateien werden verschlüsselt übertragen (TLS), auf Schadsoftware geprüft und
          verschlüsselt (AES-256) in einem Rechenzentrum in der EU gespeichert.
        </p>
        <p>
          Ein KI-System sortiert die Unterlagen vor: Es erkennt die Art des Dokuments (z. B. Meldebescheinigung) und schlägt die zuständige Stelle vor. Es trifft keine Entscheidung über Ihr Anliegen – das tut immer eine
          Mitarbeiterin oder ein Mitarbeiter des Amts. Ihre Unterlagen werden nicht zum Training von KI-Modellen verwendet.
          {process.env.DOKUMENT_KLASSIFIKATION === "modell"
            ? " Für die Erkennung wird ein Sprachmodell eines Auftragsverarbeiters in der EU eingesetzt (Vertrag nach Art. 28 DSGVO)."
            : " Die Erkennung erfolgt ausschließlich auf unseren Servern."}
        </p>
        <p>
          Nicht abgesendete Dateien löschen wir nach 24 Stunden. Abgesendete Unterlagen werden nach {tenant.uploads.aufbewahrungTage} Tagen aus dem Portal gelöscht, sofern für den Vorgang keine andere Frist gilt. Zugriff haben
          nur berechtigte Mitarbeitende des zuständigen Amts; jeder Zugriff wird protokolliert.
        </p>
        <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. a und e DSGVO, bei Ausweisdokumenten in Verbindung mit dem jeweiligen Fachrecht.</p>
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
