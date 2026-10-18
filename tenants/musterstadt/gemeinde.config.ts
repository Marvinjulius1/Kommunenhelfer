/**
 * ============================================================================
 *  Konfiguration: Stadt Musterstadt (Beispiel-Gemeinde)
 * ============================================================================
 *
 *  Diese Datei ist die EINZIGE Stelle, an der eine Gemeinde angepasst wird.
 *  Für eine neue Gemeinde: Ordner kopieren, Werte ersetzen, fertig.
 *  Siehe README.md → "Neue Gemeinde in 30 Minuten einrichten".
 *
 *  ACHTUNG: Alle Gebühren, Adressen und Zeiten in dieser Datei sind
 *  frei erfundene Beispielwerte.
 */
import { defineGemeinde } from "@/config/define";

import { erreichbarkeit, kontaktSchritt, ORT, person, PLZ } from "./bausteine";
import { weitereLeistungen } from "./leistungen";
import { TEXTE, uebersetze } from "./uebersetzungen";

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

export default defineGemeinde({
  slug: "musterstadt",
  name: "Musterstadt",
  art: "Stadt",
  wappen: "/tenants/musterstadt/wappen.svg",
  wappenAlt: "Wappen der Stadt Musterstadt: ein weißer Turm auf blauem Schild",
  akzentfarbe: "#1A5FB4",
  akzentfarbeDunkel: "#7DB3F0",

  sprachen: ["de", "ls", "en", "tr", "uk", "ar", "ru"],
  standardSprache: "de",

  texte: TEXTE,

  kontakt: {
    bezeichnung: "Stadtverwaltung Musterstadt – Bürgerbüro",
    strasse: "Marktplatz 1",
    plz: PLZ,
    ort: ORT,
    telefon: "+49 1234 5678-0",
    email: "buergerbuero@musterstadt.example",
    hinweis: "Das Rathaus ist barrierefrei über den Eingang an der Schulstraße erreichbar.",
  },

  oeffnungszeiten: {
    mo: [["08:00", "12:00"]],
    di: [["08:00", "12:00"], ["14:00", "18:00"]],
    mi: [["08:00", "12:00"]],
    do: [["08:00", "12:00"], ["14:00", "16:00"]],
    fr: [["08:00", "12:00"]],
  },
  oeffnungszeitenHinweis: "Für Ausweise und Meldeangelegenheiten bitten wir um einen Termin.",
  schliesstage: ["2026-12-24", "2026-12-25", "2026-12-26", "2026-12-31", "2027-01-01"],

  rechtliches: {
    impressumUrl: "https://www.musterstadt.example/impressum",
    datenschutzUrl: "https://www.musterstadt.example/datenschutz",
    verantwortlich: "Stadt Musterstadt, vertreten durch die Bürgermeisterin, Marktplatz 1, 12345 Musterstadt",
    datenschutzbeauftragter: "Datenschutzbeauftragte der Stadt Musterstadt, datenschutz@musterstadt.example",
    barrierefreiheitKontakt: "barrierefreiheit@musterstadt.example",
  },

  // -------------------------------------------------------------------------
  // Ämter mit buchbaren Terminen
  // -------------------------------------------------------------------------
  aemter: [
    {
      id: "buergerbuero",
      name: "Bürgerbüro",
      ort: "Rathaus, Erdgeschoss, Zimmer 0.12",
      zustaendigkeiten: ["meldewesen", "anmeldung", "ummeldung", "abmeldung", "personalausweis", "reisepass", "meldebescheinigung", "führungszeugnis", "fundsache", "beglaubigung"],
      bearbeitungshinweis: "In der Regel bearbeiten wir Ihr Anliegen innerhalb von 3 Werktagen.",
      weiterleitung: { typ: "email", adresse: "buergerbuero@musterstadt.example" },
      termine: {
        zeiten: {
          mo: [["08:00", "12:00"]],
          di: [["08:00", "12:00"], ["14:00", "18:00"]],
          mi: [["08:00", "12:00"]],
          do: [["08:00", "12:00"], ["14:00", "16:00"]],
          fr: [["08:00", "12:00"]],
        },
        slotMinuten: 15,
        parallel: 2,
        vorlaufTage: 1,
        buchbarTage: 42,
      },
    },
    {
      id: "standesamt",
      name: "Standesamt",
      ort: "Rathaus, 1. Obergeschoss, Zimmer 1.04",
      zustaendigkeiten: ["standesamt", "geburt", "geburtsurkunde", "eheschließung", "heirat", "eheurkunde", "namensänderung", "sterbefall", "personenstand"],
      bearbeitungshinweis: "In der Regel bearbeiten wir Ihr Anliegen innerhalb von 5 Werktagen.",
      weiterleitung: { typ: "backoffice" },
      termine: {
        zeiten: {
          di: [["09:00", "12:00"]],
          do: [["09:00", "12:00"], ["14:00", "16:00"]],
        },
        slotMinuten: 30,
        parallel: 1,
        vorlaufTage: 2,
        buchbarTage: 60,
      },
    },
    {
      id: "steueramt",
      name: "Steuer- und Kassenamt",
      ort: "Rathaus, 2. Obergeschoss, Zimmer 2.08",
      zustaendigkeiten: ["hundesteuer", "grundsteuer", "gewerbesteuer", "steuerbescheid", "mahnung", "zahlung", "lastschrift", "kasse"],
      bearbeitungshinweis: "In der Regel bearbeiten wir Ihr Anliegen innerhalb von 10 Werktagen.",
      weiterleitung: { typ: "backoffice" },
      termine: {
        zeiten: {
          mo: [["09:00", "12:00"]],
          mi: [["09:00", "12:00"]],
        },
        slotMinuten: 20,
        parallel: 1,
        vorlaufTage: 1,
        buchbarTage: 30,
      },
    },
    {
      id: "ordnungsamt",
      name: "Ordnungsamt",
      ort: "Rathaus, Erdgeschoss, Zimmer 0.20",
      zustaendigkeiten: ["ordnungsamt", "parken", "halteverbot", "lärm", "gewerbe", "veranstaltung", "fundsache"],
      bearbeitungshinweis: "Meldungen sehen wir uns in der Regel innerhalb von 2 Werktagen an.",
      weiterleitung: { typ: "backoffice" },
      termine: {
        zeiten: {
          di: [["09:00", "12:00"]],
          do: [["14:00", "17:00"]],
        },
        slotMinuten: 20,
        parallel: 1,
        vorlaufTage: 1,
        buchbarTage: 30,
      },
    },
    {
      id: "familie",
      name: "Jugend und Familie",
      ort: "Rathaus, 1. Obergeschoss, Zimmer 1.10",
      zustaendigkeiten: ["kita", "kindergarten", "kinderbetreuung", "familie", "jugend"],
      bearbeitungshinweis: "Kita-Plätze vergeben wir jedes Frühjahr für das neue Kitajahr.",
      weiterleitung: { typ: "backoffice" },
    },
    {
      id: "kultur",
      name: "Kultur, Bücherei und Bürgerhaus",
      ort: "Bürgerhaus, Marktplatz 3",
      zustaendigkeiten: ["bücherei", "bibliothek", "bürgerhaus", "verein", "kultur", "veranstaltung"],
      bearbeitungshinweis: "In der Regel melden wir uns innerhalb von 5 Werktagen.",
      weiterleitung: { typ: "backoffice" },
    },
    {
      id: "bauhof",
      name: "Bauhof",
      ort: "Industriestraße 4",
      zustaendigkeiten: ["bauhof", "friedhof", "grab", "straße", "schlagloch", "straßenbeleuchtung", "laterne", "spielplatz", "grünanlage", "winterdienst", "müll"],
      bearbeitungshinweis: "Wir prüfen Ihre Meldung und beheben den Mangel so schnell wie möglich.",
      weiterleitung: { typ: "backoffice" },
    },
  ],

  // -------------------------------------------------------------------------
  // Dokumenten-Upload im Assistenten
  // -------------------------------------------------------------------------
  uploads: {
    aktiv: true,
    maxDateiMB: 10,
    maxGesamtMB: 40,
    maxDateien: 10,
    aufbewahrungTage: 90,
    // Unklare Unterlagen gehen an das Bürgerbüro (zentrale Poststelle).
    standardAmtId: "buergerbuero",
  },

  // -------------------------------------------------------------------------
  // Leistungen
  // -------------------------------------------------------------------------
  leistungen: uebersetze([
    {
      id: "hund-anmelden",
      aktiv: true,
      titel: { de: "Hund anmelden", en: "Register a dog" },
      kurz: {
        de: "Wer in Musterstadt einen Hund hält, muss ihn innerhalb von 14 Tagen zur Hundesteuer anmelden.",
        en: "If you keep a dog in Musterstadt, you must register it for dog tax within 14 days.",
      },
      beschreibung:
        "Nach der Anmeldung erhalten Sie einen Steuerbescheid und eine Hundesteuermarke per Post. Die Steuer wird jährlich erhoben.",
      stichworte: ["hund", "hunde", "hundesteuer", "welpe", "hund anmelden", "neuer hund", "neuen hund", "hund gekauft", "hund angeschafft", "hündin", "rüde", "register dog", "dog tax"],
      unterlagen: [
        "Angaben zum Hund (Name, Rasse, Geburtsdatum, Chipnummer)",
        "Nachweis der Hundehaftpflichtversicherung (Name der Versicherung, Versicherungsnummer)",
        "Ihre Bankverbindung, wenn Sie am Lastschriftverfahren teilnehmen möchten",
      ],
      gebuehren: [
        { bezeichnung: "Hundesteuer für den ersten Hund", betrag: 96, hinweis: "pro Jahr" },
        { bezeichnung: "Hundesteuer für jeden weiteren Hund", betrag: 144, hinweis: "pro Jahr und Hund" },
        { bezeichnung: "Hundesteuer für einen gefährlichen Hund", betrag: 600, hinweis: "pro Jahr" },
        { bezeichnung: "Blindenführhunde und Assistenzhunde", betrag: null, hinweis: "steuerfrei auf Antrag mit Nachweis" },
      ],
      ablauf: [
        "Sie füllen den Online-Antrag aus (ca. 5 Minuten).",
        "Sie erhalten sofort eine Eingangsbestätigung per E-Mail.",
        "Das Steueramt prüft Ihre Angaben.",
        "Sie erhalten den Steuerbescheid und die Hundesteuermarke per Post.",
      ],
      fristen: ["Anmeldung innerhalb von 14 Tagen nach Aufnahme des Hundes oder nach Zuzug."],
      amtId: "steueramt",
      dokumente: [
        { art: "versicherungsnachweis", pflicht: true, hinweis: "Nachweis der Hundehaftpflichtversicherung" },
        { art: "schwerbehindertenausweis", pflicht: false, hinweis: "Nur bei Antrag auf Steuerbefreiung" },
      ],
      online: true,
      termin: true,
      dauer: { de: "ca. 5 Minuten", en: "approx. 5 minutes" },
      leistungsschluessel: "99106001000000",
      rechtsgrundlage: "Hundesteuersatzung der Stadt Musterstadt (Beispiel)",
      formular: {
        aufbewahrungTage: 90,
        schritte: [
          kontaktSchritt,
          {
            id: "hund",
            titel: "Ihr Hund",
            beschreibung: "Diese Angaben finden Sie im Heimtierausweis.",
            felder: [
              { id: "hundName", typ: "text", label: "Name des Hundes", pflicht: true, maxLaenge: 60, halb: true },
              { id: "rasse", typ: "text", label: "Rasse", hinweis: "Bei Mischlingen z. B. „Mischling“.", pflicht: true, maxLaenge: 80, halb: true },
              {
                id: "geschlecht",
                typ: "radio",
                label: "Geschlecht",
                pflicht: true,
                optionen: [
                  { wert: "hündin", label: "Hündin" },
                  { wert: "rüde", label: "Rüde" },
                ],
              },
              { id: "hundGeburtsdatum", typ: "date", label: "Geburtsdatum (ungefähr)", pflicht: true, halb: true },
              { id: "farbe", typ: "text", label: "Farbe", pflicht: true, maxLaenge: 40, halb: true },
              {
                id: "chipnummer",
                typ: "text",
                label: "Chipnummer (Transponder)",
                hinweis: "15 Ziffern, steht im Heimtierausweis.",
                pflicht: true,
                muster: "^[0-9]{15}$",
                musterFehler: "Die Chipnummer besteht aus genau 15 Ziffern.",
              },
              { id: "haltungSeit", typ: "date", label: "Bei Ihnen seit", hinweis: "Der Tag, an dem der Hund bei Ihnen eingezogen ist.", pflicht: true },
            ],
          },
          {
            id: "steuer",
            titel: "Hundesteuer",
            beschreibung: "Damit wir den richtigen Steuersatz festlegen können.",
            felder: [
              {
                id: "anzahl",
                typ: "radio",
                label: "Ist das Ihr erster Hund in Musterstadt?",
                pflicht: true,
                optionen: [
                  { wert: "erster", label: "Ja, das ist mein erster Hund", hinweis: "96 € pro Jahr" },
                  { wert: "weiterer", label: "Nein, ich halte bereits einen Hund", hinweis: "144 € pro Jahr" },
                ],
              },
              {
                id: "gefaehrlich",
                typ: "radio",
                label: "Gilt Ihr Hund nach Landesrecht als gefährlicher Hund?",
                hinweis: "Wenn Sie unsicher sind, wählen Sie „Weiß ich nicht“. Wir klären das mit Ihnen.",
                pflicht: true,
                optionen: [
                  { wert: "nein", label: "Nein" },
                  { wert: "ja", label: "Ja" },
                  { wert: "unklar", label: "Weiß ich nicht" },
                ],
              },
              {
                id: "befreiung",
                typ: "select",
                label: "Möchten Sie eine Steuerbefreiung beantragen?",
                pflicht: true,
                standard: "keine",
                optionen: [
                  { wert: "keine", label: "Nein" },
                  { wert: "blindenfuehrhund", label: "Ja – Blindenführhund" },
                  { wert: "assistenzhund", label: "Ja – Assistenzhund" },
                ],
              },
              {
                id: "befreiungNachweis",
                typ: "textarea",
                label: "Welchen Nachweis können Sie vorlegen?",
                hinweis: "Zum Beispiel: Schwerbehindertenausweis mit Merkzeichen „Bl“. Das Steueramt meldet sich bei Ihnen.",
                pflicht: true,
                maxLaenge: 500,
                nurWenn: { feld: "befreiung", gleich: ["blindenfuehrhund", "assistenzhund"] },
              },
              { id: "versicherung", typ: "text", label: "Hundehaftpflicht: Name der Versicherung", pflicht: true, maxLaenge: 80, halb: true },
              { id: "versicherungsnummer", typ: "text", label: "Versicherungsnummer", pflicht: true, maxLaenge: 40, halb: true },
            ],
          },
          {
            id: "zahlung",
            titel: "Zahlung",
            beschreibung: "Sie können die Hundesteuer bequem abbuchen lassen oder selbst überweisen.",
            felder: [
              {
                id: "zahlart",
                typ: "radio",
                label: "Wie möchten Sie zahlen?",
                pflicht: true,
                optionen: [
                  { wert: "lastschrift", label: "SEPA-Lastschrift", hinweis: "Der Betrag wird automatisch abgebucht." },
                  { wert: "ueberweisung", label: "Überweisung", hinweis: "Sie erhalten die Bankverbindung mit dem Bescheid." },
                ],
              },
              {
                id: "kontoinhaber",
                typ: "text",
                label: "Kontoinhaberin / Kontoinhaber",
                pflicht: true,
                autocomplete: "cc-name",
                maxLaenge: 120,
                nurWenn: { feld: "zahlart", gleich: "lastschrift" },
              },
              {
                id: "iban",
                typ: "iban",
                label: "IBAN",
                pflicht: true,
                sensibel: true,
                nurWenn: { feld: "zahlart", gleich: "lastschrift" },
              },
              {
                id: "mandat",
                typ: "checkbox",
                label:
                  "Ich ermächtige die Stadt Musterstadt, die Hundesteuer von meinem Konto per Lastschrift einzuziehen. Das Mandat kann ich jederzeit widerrufen.",
                pflicht: true,
                nurWenn: { feld: "zahlart", gleich: "lastschrift" },
              },
            ],
          },
        ],
        bestaetigungen: [{ id: "richtig", label: "Ich bestätige, dass meine Angaben richtig und vollständig sind." }],
      },
    },
    {
      id: "hund-abmelden",
      aktiv: true,
      titel: { de: "Hund abmelden", en: "Deregister a dog" },
      kurz: "Wenn Ihr Hund verstorben ist, abgegeben wurde oder Sie wegziehen, melden Sie ihn von der Hundesteuer ab.",
      stichworte: ["hund abmelden", "hund verstorben", "hund gestorben", "hund abgegeben", "hundesteuer abmelden"],
      unterlagen: ["Ihre Steuernummer oder Hundesteuermarke", "Datum und Grund der Abmeldung"],
      gebuehren: [{ bezeichnung: "Abmeldung", betrag: null }],
      ablauf: [
        "Sie füllen den Online-Antrag aus (ca. 2 Minuten).",
        "Bitte geben Sie die Hundesteuermarke im Rathaus ab oder senden Sie sie per Post.",
        "Sie erhalten einen Änderungsbescheid. Zu viel gezahlte Steuer wird erstattet.",
      ],
      amtId: "steueramt",
      online: true,
      termin: false,
      dauer: "ca. 2 Minuten",
      formular: {
        aufbewahrungTage: 90,
        schritte: [
          kontaktSchritt,
          {
            id: "abmeldung",
            titel: "Abmeldung",
            felder: [
              { id: "hundName", typ: "text", label: "Name des Hundes", pflicht: true, maxLaenge: 60, halb: true },
              { id: "markennummer", typ: "text", label: "Nummer der Steuermarke (falls bekannt)", maxLaenge: 20, halb: true },
              {
                id: "grund",
                typ: "select",
                label: "Grund",
                pflicht: true,
                optionen: [
                  { wert: "verstorben", label: "Der Hund ist verstorben" },
                  { wert: "abgegeben", label: "Der Hund wurde abgegeben" },
                  { wert: "wegzug", label: "Ich ziehe aus Musterstadt weg" },
                  { wert: "sonstiges", label: "Sonstiges" },
                ],
              },
              { id: "datum", typ: "date", label: "Seit wann?", pflicht: true },
              {
                id: "neuerHalter",
                typ: "text",
                label: "Name und Anschrift der neuen Halterin / des neuen Halters",
                pflicht: true,
                maxLaenge: 200,
                nurWenn: { feld: "grund", gleich: "abgegeben" },
              },
            ],
          },
        ],
      },
    },
    {
      id: "wohnsitz-anmelden",
      aktiv: true,
      titel: { de: "Wohnsitz anmelden (Umzug)", en: "Register your address (moving)" },
      kurz: "Nach einem Umzug nach oder innerhalb von Musterstadt müssen Sie sich innerhalb von zwei Wochen anmelden – online mit dem Online-Ausweis oder mit Termin im Bürgerbüro.",
      beschreibung:
        "Online geht es mit dem Personalausweis mit Online-Ausweisfunktion (PIN). Ihre neue Adresse wird anschließend auf dem Ausweis gespeichert: Den Aufkleber für die Rückseite schicken wir Ihnen per Post. Ohne Online-Ausweis buchen Sie bitte einen Termin.",
      stichworte: ["umzug", "umziehen", "anmelden", "ummelden", "ummeldung", "wohnsitz", "neue wohnung", "zuzug", "adresse ändern", "meldeadresse", "eingezogen", "wohnsitzanmeldung"],
      unterlagen: [
        "Online: Personalausweis mit Online-Ausweisfunktion und PIN",
        "Wohnungsgeberbestätigung (erhalten Sie von Ihrer Vermieterin / Ihrem Vermieter)",
        "Im Bürgerbüro: Personalausweis oder Reisepass aller Personen, die umziehen; bei Kindern ggf. Geburtsurkunde",
      ],
      gebuehren: [{ bezeichnung: "Anmeldung", betrag: null }],
      ablauf: [
        "Sie melden sich mit dem Online-Ausweis an.",
        "Sie geben die neue Adresse ein und laden die Wohnungsgeberbestätigung hoch.",
        "Wir prüfen die Anmeldung und schicken Ihnen die Meldebestätigung ins Postfach.",
        "Den Adressaufkleber für Ihren Ausweis erhalten Sie per Post.",
      ],
      fristen: ["Innerhalb von 2 Wochen nach dem Einzug (§ 17 Bundesmeldegesetz)."],
      amtId: "buergerbuero",
      dokumente: [{ art: "wohnungsgeberbestaetigung", pflicht: true }],
      online: true,
      erfordertOnlineAusweis: true,
      termin: true,
      dauer: "ca. 5 Minuten",
      formular: {
        aufbewahrungTage: 90,
        schritte: [
          {
            id: "person",
            titel: "Ihre Angaben",
            beschreibung: "Name und Geburtsdatum stammen aus Ihrem Online-Ausweis.",
            felder: [...person, ...erreichbarkeit],
          },
          {
            id: "neu",
            titel: "Neue Wohnung",
            felder: [
              { id: "strasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, autocomplete: "street-address", maxLaenge: 120 },
              { id: "zusatz", typ: "text", label: "Adresszusatz (freiwillig)", hinweis: "z. B. Hinterhaus, 2. OG links", maxLaenge: 80 },
              { id: "plz", typ: "plz", label: "Postleitzahl", pflicht: true, standard: PLZ, halb: true },
              { id: "ort", typ: "text", label: "Ort", pflicht: true, standard: ORT, halb: true },
              { id: "einzug", typ: "date", label: "Tag des Einzugs", pflicht: true, halb: true },
              {
                id: "wohnungsart",
                typ: "radio",
                label: "Diese Wohnung ist",
                pflicht: true,
                optionen: [
                  { wert: "haupt", label: "meine einzige Wohnung bzw. Hauptwohnung" },
                  { wert: "neben", label: "eine Nebenwohnung" },
                ],
              },
            ],
          },
          {
            id: "alt",
            titel: "Bisherige Wohnung",
            felder: [
              { id: "altStrasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, maxLaenge: 120 },
              { id: "altPlz", typ: "plz", label: "Postleitzahl", pflicht: true, halb: true },
              { id: "altOrt", typ: "text", label: "Ort", pflicht: true, maxLaenge: 80, halb: true },
              {
                id: "altBeibehalten",
                typ: "radio",
                label: "Behalten Sie die bisherige Wohnung?",
                pflicht: true,
                optionen: [
                  { wert: "nein", label: "Nein" },
                  { wert: "ja", label: "Ja, als Nebenwohnung" },
                ],
              },
            ],
          },
          {
            id: "weitere",
            titel: "Ziehen weitere Personen mit um?",
            beschreibung: "Familienangehörige können Sie hier mit anmelden. Volljährige benötigen dafür eine Vollmacht.",
            felder: [
              {
                id: "mitziehende",
                typ: "textarea",
                label: "Name und Geburtsdatum der weiteren Personen (freiwillig)",
                hinweis: "Eine Person pro Zeile, z. B. „Mia Muster, 03.05.2018“.",
                maxLaenge: 1000,
              },
            ],
          },
        ],
        bestaetigungen: [{ id: "richtig", label: "Ich versichere, dass meine Angaben richtig und vollständig sind (§ 17 BMG)." }],
      },
      leistungsschluessel: "99115001000000",
      rechtsgrundlage: "§ 17 Bundesmeldegesetz (BMG)",
    },
    {
      id: "wohnsitz-abmelden",
      aktiv: true,
      titel: { de: "Wohnsitz abmelden (Wegzug ins Ausland)", en: "Deregister (moving abroad)" },
      kurz: "Wenn Sie ins Ausland ziehen, melden Sie sich in Musterstadt ab. Bei einem Umzug innerhalb Deutschlands ist das nicht nötig.",
      stichworte: ["abmelden", "abmeldung", "ausland", "auswandern", "wegzug ausland"],
      unterlagen: ["Personalausweis oder Reisepass", "Neue Anschrift im Ausland (falls bekannt)"],
      gebuehren: [{ bezeichnung: "Abmeldung", betrag: null }],
      ablauf: ["Sie buchen einen Termin oder senden die Abmeldung schriftlich.", "Sie erhalten eine Abmeldebestätigung."],
      fristen: ["Frühestens eine Woche vor und spätestens zwei Wochen nach dem Auszug (§ 17 BMG)."],
      amtId: "buergerbuero",
      online: false,
      termin: true,
      rechtsgrundlage: "§ 17 Bundesmeldegesetz (BMG)",
    },
    {
      id: "namensaenderung",
      aktiv: true,
      titel: { de: "Namensänderung", en: "Change of name" },
      kurz: "Eine Namensänderung nach Heirat, Scheidung oder aus wichtigem Grund klären Sie mit dem Standesamt.",
      beschreibung:
        "Je nach Situation gibt es unterschiedliche Wege: eine Namenserklärung (z. B. nach der Eheschließung oder Scheidung) beim Standesamt oder eine öffentlich-rechtliche Namensänderung aus wichtigem Grund. Im Termin klären wir, welcher Weg für Sie passt.",
      stichworte: ["name", "namensänderung", "namen ändern", "nachname", "heirat", "geheiratet", "scheidung", "geburtsname", "ehename", "vorname ändern", "change name", "name change"],
      unterlagen: [
        "Personalausweis oder Reisepass",
        "Je nach Fall: Eheurkunde, Scheidungsurteil oder Geburtsurkunde",
        "Bringen Sie im Zweifel lieber alle Personenstandsurkunden mit",
      ],
      gebuehren: [
        { bezeichnung: "Namenserklärung beim Standesamt", betrag: "abhängig vom Einzelfall", hinweis: "Wird im Termin genannt." },
      ],
      ablauf: [
        "Sie buchen einen Termin beim Standesamt.",
        "Wir prüfen gemeinsam, welche Erklärung möglich ist.",
        "Die Erklärung wird beurkundet.",
        "Danach beantragen Sie neue Ausweisdokumente im Bürgerbüro.",
      ],
      amtId: "standesamt",
      dokumente: [
        { art: "personalausweis", pflicht: true },
        { art: "eheurkunde", pflicht: false, hinweis: "Bei Namensänderung nach der Eheschließung" },
        { art: "scheidungsurteil", pflicht: false, hinweis: "Bei Namensänderung nach einer Scheidung" },
        { art: "geburtsurkunde", pflicht: false },
      ],
      online: false,
      termin: true,
    },
    {
      id: "personalausweis",
      aktiv: true,
      titel: { de: "Personalausweis beantragen", en: "Apply for an ID card" },
      kurz: "Den Personalausweis beantragen Sie persönlich im Bürgerbüro. Bitte buchen Sie einen Termin.",
      stichworte: ["personalausweis", "ausweis", "perso", "id karte", "ausweis abgelaufen", "neuer ausweis", "id card"],
      unterlagen: [
        "Aktuelles biometrisches Passfoto (oder digital bei einem zertifizierten Anbieter)",
        "Bisheriger Ausweis oder Reisepass",
        "Bei Erstantrag: Geburtsurkunde",
      ],
      gebuehren: [
        { bezeichnung: "Personalausweis (ab 24 Jahren)", betrag: 46 },
        { bezeichnung: "Personalausweis (unter 24 Jahren)", betrag: 27.6 },
      ],
      ablauf: [
        "Sie buchen einen Termin im Bürgerbüro.",
        "Im Termin werden Ihre Fingerabdrücke erfasst und Sie unterschreiben.",
        "Nach ca. 3–4 Wochen holen Sie den Ausweis ab. Wir informieren Sie per E-Mail.",
      ],
      amtId: "buergerbuero",
      online: false,
      termin: true,
      rechtsgrundlage: "Personalausweisgesetz (PAuswG), Personalausweisgebührenverordnung",
    },
    {
      id: "reisepass",
      aktiv: true,
      titel: { de: "Reisepass beantragen", en: "Apply for a passport" },
      kurz: "Den Reisepass beantragen Sie persönlich im Bürgerbüro. Bitte buchen Sie einen Termin.",
      stichworte: ["reisepass", "pass", "urlaub ausland", "pass abgelaufen", "kinderreisepass", "passport"],
      unterlagen: ["Aktuelles biometrisches Passfoto", "Bisheriger Pass oder Personalausweis"],
      gebuehren: [
        { bezeichnung: "Reisepass (ab 24 Jahren)", betrag: 70 },
        { bezeichnung: "Reisepass (unter 24 Jahren)", betrag: 37.5 },
      ],
      ablauf: [
        "Sie buchen einen Termin im Bürgerbüro.",
        "Im Termin werden Ihre Fingerabdrücke erfasst.",
        "Nach ca. 4–6 Wochen holen Sie den Pass ab.",
      ],
      amtId: "buergerbuero",
      online: false,
      termin: true,
    },
    {
      id: "meldebescheinigung",
      aktiv: true,
      titel: { de: "Meldebescheinigung", en: "Certificate of registration" },
      kurz: "Eine Meldebescheinigung bestätigt Ihre Adresse. Sie können sie online bestellen und erhalten sie per Post.",
      stichworte: ["meldebescheinigung", "meldebestätigung", "wohnsitzbescheinigung", "aufenthaltsbescheinigung", "bescheinigung adresse", "certificate of registration"],
      unterlagen: ["Keine – Sie geben nur Ihre persönlichen Daten an."],
      gebuehren: [{ bezeichnung: "Meldebescheinigung", betrag: 10 }],
      bezahlung: { betrag: 10 },
      ablauf: [
        "Sie bestellen die Bescheinigung online (ca. 2 Minuten).",
        "Wir prüfen Ihre Angaben im Melderegister.",
        "Sie bezahlen direkt online – oder später per Rechnung.",
        "Sie erhalten die Bescheinigung per Post.",
      ],
      amtId: "buergerbuero",
      online: true,
      termin: false,
      dauer: "ca. 2 Minuten",
      formular: {
        aufbewahrungTage: 30,
        schritte: [
          kontaktSchritt,
          {
            id: "art",
            titel: "Bescheinigung",
            felder: [
              {
                id: "umfang",
                typ: "radio",
                label: "Welche Bescheinigung benötigen Sie?",
                pflicht: true,
                optionen: [
                  { wert: "einfach", label: "Einfache Meldebescheinigung", hinweis: "Name und aktuelle Anschrift" },
                  { wert: "erweitert", label: "Erweiterte Meldebescheinigung", hinweis: "Zusätzlich frühere Anschriften, Staatsangehörigkeit u. a." },
                ],
              },
              { id: "zweck", typ: "text", label: "Wofür benötigen Sie die Bescheinigung? (freiwillig)", maxLaenge: 120 },
            ],
          },
        ],
      },
    },
    {
      id: "geburtsurkunde",
      aktiv: true,
      titel: { de: "Geburtsurkunde bestellen", en: "Order a birth certificate" },
      kurz: "Wenn Sie in Musterstadt geboren sind, können Sie Ihre Geburtsurkunde online beim Standesamt bestellen.",
      stichworte: ["geburtsurkunde", "urkunde", "geburt", "geburtsregister", "birth certificate"],
      unterlagen: ["Angaben zur Geburt (Name bei Geburt, Geburtsdatum)"],
      gebuehren: [
        { bezeichnung: "Geburtsurkunde", betrag: 12 },
        { bezeichnung: "jede weitere Ausfertigung", betrag: 6 },
      ],
      bezahlung: { betrag: 12, mengeFeld: "anzahl", weitere: 6 },
      ablauf: ["Sie bestellen online.", "Das Standesamt prüft Ihre Berechtigung.", "Sie bezahlen online oder per Rechnung.", "Sie erhalten die Urkunde per Post."],
      amtId: "standesamt",
      dokumente: [{ art: "personalausweis", pflicht: true, hinweis: "Zur Prüfung Ihrer Berechtigung" }],
      online: true,
      termin: false,
      dauer: "ca. 3 Minuten",
      formular: {
        aufbewahrungTage: 30,
        schritte: [
          kontaktSchritt,
          {
            id: "geburt",
            titel: "Angaben zur Geburt",
            beschreibung: "Die Urkunde muss in Musterstadt beurkundet worden sein.",
            felder: [
              {
                id: "fuerWen",
                typ: "radio",
                label: "Für wen bestellen Sie?",
                pflicht: true,
                optionen: [
                  { wert: "selbst", label: "Für mich selbst" },
                  { wert: "kind", label: "Für mein Kind" },
                  { wert: "andere", label: "Für eine andere Person", hinweis: "Nur mit berechtigtem Interesse (§ 62 PStG)." },
                ],
              },
              { id: "geburtsname", typ: "text", label: "Name bei Geburt", pflicht: true, maxLaenge: 120, halb: true },
              { id: "gebDatum", typ: "date", label: "Geburtsdatum", pflicht: true, halb: true },
              { id: "anzahl", typ: "number", label: "Anzahl der Urkunden", pflicht: true, min: 1, max: 5, standard: "1" },
              {
                id: "interesse",
                typ: "textarea",
                label: "Worin besteht Ihr berechtigtes Interesse?",
                pflicht: true,
                maxLaenge: 500,
                nurWenn: { feld: "fuerWen", gleich: "andere" },
              },
            ],
          },
        ],
      },
    },
    {
      id: "fuehrungszeugnis",
      aktiv: true,
      titel: { de: "Führungszeugnis beantragen", en: "Certificate of good conduct" },
      kurz: "Ein Führungszeugnis beantragen Sie online beim Bundesamt für Justiz oder persönlich im Bürgerbüro.",
      stichworte: ["führungszeugnis", "polizeiliches führungszeugnis", "erweitertes führungszeugnis"],
      unterlagen: ["Personalausweis oder Reisepass", "Bei erweitertem Führungszeugnis: schriftliche Aufforderung des Arbeitgebers"],
      gebuehren: [{ bezeichnung: "Führungszeugnis", betrag: 13, hinweis: "Gebühr des Bundesamts für Justiz" }],
      ablauf: [
        "Online: mit Online-Ausweisfunktion beim Bundesamt für Justiz.",
        "Oder: Termin im Bürgerbüro buchen.",
        "Das Führungszeugnis wird Ihnen per Post zugeschickt.",
      ],
      amtId: "buergerbuero",
      online: false,
      termin: true,
      externerLink: { label: "Online beim Bundesamt für Justiz", url: "https://www.fuehrungszeugnis.bund.de" },
    },
    ...weitereLeistungen,
  ]),

  // -------------------------------------------------------------------------
  // Rückfragen bei mehrdeutigen Anliegen
  // -------------------------------------------------------------------------
  // Ratsinformationen. Mit `oparlUrl` werden die Sitzungen live aus dem
  // Ratsinformationssystem geladen; die Einträge hier dienen dann nur als Ersatz.
  ratsinfo: {
    sitzungen: [
      {
        id: "rat-2026-11",
        gremium: "Stadtrat",
        datum: "2026-11-12T18:00:00+01:00",
        ort: "Rathaus, Ratssaal",
        tagesordnung: [
          { titel: "Haushalt 2027 – erste Lesung", kurz: "Wofür die Stadt im nächsten Jahr Geld ausgeben will." },
          { titel: "Neubau Kita Nordviertel", kurz: "Bau einer Kita mit 75 Plätzen an der Lindenallee." },
          { titel: "Fragestunde für Einwohnerinnen und Einwohner", kurz: "Sie können Fragen an den Rat stellen." },
        ],
        livestream: "https://www.musterstadt.example/live",
      },
      {
        id: "bau-2026-11",
        gremium: "Bau- und Umweltausschuss",
        datum: "2026-11-03T17:00:00+01:00",
        ort: "Rathaus, Sitzungszimmer 2.01",
        tagesordnung: [
          { titel: "Sanierung Hauptstraße, Bauabschnitt 2", kurz: "Zeitplan und Umleitungen während der Bauarbeiten." },
          { titel: "Neue Fahrradabstellanlagen am Bahnhof" },
        ],
      },
      {
        id: "rat-2026-09",
        gremium: "Stadtrat",
        datum: "2026-09-24T18:00:00+02:00",
        ort: "Rathaus, Ratssaal",
        tagesordnung: [
          { titel: "Online-Bürgerportal", kurz: "Einführung des digitalen Bürgerservice.", beschluss: "Einstimmig beschlossen." },
          { titel: "Änderung der Hundesteuersatzung", beschluss: "Mehrheitlich beschlossen (19 Ja, 4 Nein, 2 Enthaltungen)." },
          { titel: "Spielplatz Stadtpark – Erneuerung der Geräte", beschluss: "Einstimmig beschlossen." },
        ],
      },
    ],
  },

  // Video-Beratung über einen Jitsi-Server in der EU (Beispieladresse)
  videoBeratung: { url: "https://meet.musterstadt.example", aemter: ["standesamt", "steueramt", "ordnungsamt"] },

  // Beispiel-Fundsachen (im Echtbetrieb erfasst das Fundbüro im Backoffice)
  fundsachen: [
    { id: "1", bezeichnung: "Schlüsselbund mit 3 Schlüsseln", beschreibung: "Mit rotem Anhänger", fundort: "Marktplatz", funddatum: "2026-10-12", kategorie: "Schlüssel" },
    { id: "2", bezeichnung: "Schwarzer Rucksack", beschreibung: "Mittelgroß, mit Laptopfach", fundort: "Bushaltestelle Bahnhof", funddatum: "2026-10-09", kategorie: "Tasche / Rucksack" },
    { id: "3", bezeichnung: "Damenfahrrad", beschreibung: "Blau, 28 Zoll, mit Korb", fundort: "Schulstraße", funddatum: "2026-09-28", kategorie: "Fahrrad" },
    { id: "4", bezeichnung: "Smartphone", beschreibung: "Mit dunkler Hülle", fundort: "Stadtpark", funddatum: "2026-10-14", kategorie: "Handy / Elektronik" },
  ],

  dokumentarten: [
    { id: "fahrzeugschein", label: { de: "Fahrzeugschein (Zulassungsbescheinigung Teil I)", en: "Vehicle registration certificate" }, stichworte: ["zulassungsbescheinigung teil i", "fahrzeugschein", "zulassungsbescheinigung"] },
    { id: "freistellungsbescheid", label: { de: "Freistellungsbescheid (Gemeinnützigkeit)", en: "Tax exemption notice" }, stichworte: ["freistellungsbescheid", "gemeinnützig", "körperschaftsteuer"] },
  ],

  rueckfragen: [
    {
      id: "gewerbe",
      stichworte: ["gewerbe", "gewerbeschein", "business"],
      frage: { de: "Möchten Sie ein Gewerbe anmelden oder abmelden?", en: "Do you want to register or deregister a business?" },
      optionen: [
        { label: { de: "Gewerbe anmelden", en: "Register" }, leistungId: "gewerbe-anmelden" },
        { label: { de: "Gewerbe abmelden", en: "Deregister" }, leistungId: "gewerbe-abmelden" },
      ],
    },
    {
      id: "umzug",
      stichworte: ["umzug", "umziehen", "ziehe um", "wohnung", "wegziehen", "neue adresse", "moving", "move"],
      frage: {
        de: "Gern. Wohin ziehen Sie?",
        en: "Of course. Where are you moving to?",
      },
      optionen: [
        { label: { de: "Nach oder innerhalb von Musterstadt", en: "To or within Musterstadt" }, leistungId: "wohnsitz-anmelden" },
        { label: { de: "Ins Ausland", en: "Abroad" }, leistungId: "wohnsitz-abmelden" },
      ],
    },
    {
      id: "hund",
      stichworte: ["hund", "dog"],
      frage: { de: "Möchten Sie einen Hund anmelden oder abmelden?", en: "Do you want to register or deregister a dog?" },
      optionen: [
        { label: { de: "Hund anmelden", en: "Register a dog" }, leistungId: "hund-anmelden" },
        { label: { de: "Hund abmelden", en: "Deregister a dog" }, leistungId: "hund-abmelden" },
      ],
    },
    {
      id: "ausweis",
      stichworte: ["ausweis", "ausweisdokument", "dokument", "identity document"],
      frage: { de: "Welches Dokument benötigen Sie?", en: "Which document do you need?" },
      optionen: [
        { label: "Personalausweis", leistungId: "personalausweis" },
        { label: "Reisepass", leistungId: "reisepass" },
      ],
    },
  ],

  faq: [
    {
      frage: "Brauche ich für jeden Besuch im Rathaus einen Termin?",
      antwort:
        "Für Ausweise, Pässe und Meldeangelegenheiten ja. Andere Anliegen können Sie zu den Öffnungszeiten auch ohne Termin klären.",
    },
    {
      frage: "Wie kann ich im Bürgerbüro bezahlen?",
      antwort: "Im Bürgerbüro können Sie mit Girocard oder bar bezahlen.",
    },
    {
      frage: "Gibt es Parkplätze am Rathaus?",
      antwort: "Ja, auf dem Marktplatz gibt es Parkplätze, davon zwei Behindertenparkplätze direkt am Eingang Schulstraße.",
    },
    {
      frage: "Kann eine andere Person mein Anliegen erledigen?",
      antwort:
        "Bei vielen Anliegen ja, mit einer schriftlichen Vollmacht und Ihrem Ausweis. Ausweise und Pässe müssen Sie persönlich beantragen.",
    },
  ],

  // -------------------------------------------------------------------------
  // Wohnort, Abfall, Mängelmelder, Lebenslagen
  // (Beispieldaten – Bezirke und Termine sind frei erfunden)
  // -------------------------------------------------------------------------
  ortsteile: ["Altstadt", "Nordviertel", "Südfeld", "Oberdorf"],

  // ---------------------------------------------------------------- Etappe 9: Bürgerdienste (Beispieldaten)
  karte: { mitte: [50.6512, 9.7458], zoom: 15 },
  // ars: "000000000000", // Amtlicher Regionalschlüssel für Warnungen aus NINA – für die Musterstadt (fiktiv) nicht gesetzt

  kitas: [
    { id: "sonnenschein", name: "Kita Sonnenschein", traeger: "Stadt Musterstadt", adresse: "Lindenallee 12", ortsteil: "Nordviertel", lat: 50.6551, lng: 9.7431, altersgruppen: ["u3", "ue3"], plaetze: 75, oeffnungszeiten: "Mo–Fr 7–17 Uhr", profil: "Naturnah, mit großem Garten" },
    { id: "regenbogen", name: "Ev. Kita Regenbogen", traeger: "Ev. Kirchengemeinde", adresse: "Kirchplatz 2", ortsteil: "Altstadt", lat: 50.6509, lng: 9.7462, altersgruppen: ["ue3"], plaetze: 50, oeffnungszeiten: "Mo–Fr 7:30–16:30 Uhr", profil: "Religionspädagogisch, Sprachförderung" },
    { id: "krabbelstube", name: "Krabbelstube Zwergenland", traeger: "Elternverein Zwergenland e. V.", adresse: "Südring 8", ortsteil: "Südfeld", lat: 50.6468, lng: 9.7489, altersgruppen: ["u3"], plaetze: 24, oeffnungszeiten: "Mo–Fr 7–15 Uhr" },
    { id: "schulhort", name: "Hort an der Grundschule", traeger: "Stadt Musterstadt", adresse: "Schulweg 1", ortsteil: "Oberdorf", lat: 50.6533, lng: 9.7392, altersgruppen: ["hort"], plaetze: 40, oeffnungszeiten: "Mo–Fr 11:30–17 Uhr" },
  ],

  vereine: [
    { id: "tsv", name: "TSV Musterstadt 1898 e. V.", kategorie: "Sport", kurz: "Fußball, Turnen, Leichtathletik und Kinderturnen", web: "https://www.musterstadt.example/tsv", kontaktEmail: "info@tsv-musterstadt.example" },
    { id: "feuerwehr", name: "Freiwillige Feuerwehr Musterstadt", kategorie: "Ehrenamt", kurz: "Brandschutz, Hilfe in Notlagen und Jugendfeuerwehr ab 10 Jahren", kontaktEmail: "jugend@feuerwehr-musterstadt.example" },
    { id: "heimatverein", name: "Heimat- und Geschichtsverein", kategorie: "Kultur", kurz: "Stadtführungen, Heimatmuseum und Erzählcafé" },
    { id: "musikschule", name: "Musikschule Musterstadt e. V.", kategorie: "Musik", kurz: "Unterricht für Kinder und Erwachsene, Bläserklasse, Chor", kontaktEmail: "kontakt@musikschule-musterstadt.example" },
    { id: "tafel", name: "Musterstädter Tafel", kategorie: "Soziales", kurz: "Lebensmittel für Menschen mit wenig Geld – getragen von Freiwilligen", kontaktEmail: "tafel@musterstadt.example" },
  ],

  veranstaltungen: [
    { id: "martinsumzug-2026", titel: "Martinsumzug", text: "Laternenumzug vom Kirchplatz zum Marktplatz mit Martinsfeuer und Weckmännern.", beginn: "2026-11-11T17:30", ort: "Kirchplatz", kategorie: "Fest" },
    { id: "weihnachtsmarkt-2026", titel: "Weihnachtsmarkt", text: "Drei Tage Weihnachtsmarkt rund ums Rathaus mit Kinderprogramm und Musik der Musikschule.", beginn: "2026-12-04T15:00", ende: "2026-12-06T20:00", ort: "Marktplatz", kategorie: "Fest", vereinId: "musikschule" },
    { id: "stadtfuehrung-2026-11", titel: "Stadtführung: Musterstadt im Mittelalter", text: "Rundgang durch die Altstadt mit dem Heimatverein. Dauer etwa 90 Minuten.", beginn: "2026-11-21T14:00", ort: "Treffpunkt Rathaus", kategorie: "Kultur", vereinId: "heimatverein", anmeldung: true, plaetze: 25, kosten: "5 €, Kinder frei" },
    { id: "erste-hilfe-2026", titel: "Erste-Hilfe-Kurs für Eltern", text: "Notfälle bei Kindern erkennen und richtig handeln. Mit praktischen Übungen.", beginn: "2026-11-28T09:00", ende: "2026-11-28T15:00", ort: "Bürgerhaus, Saal 2", kategorie: "Kurs", anmeldung: true, plaetze: 16, kosten: "kostenfrei" },
    { id: "ferien-feuerwehr-2027", titel: "Ferienprogramm: Ein Tag bei der Feuerwehr", text: "Löschübung, Fahrzeuge erkunden und Mittagessen im Gerätehaus.", beginn: "2027-07-14T09:00", ende: "2027-07-14T14:00", ort: "Feuerwehrhaus", kategorie: "Ferienprogramm", vereinId: "feuerwehr", ferienprogramm: true, anmeldung: true, plaetze: 20, kosten: "3 €", alter: "8–12 Jahre" },
    { id: "ferien-wald-2027", titel: "Ferienprogramm: Waldtag mit dem Förster", text: "Tierspuren lesen, Waldsofa bauen, Stockbrot am Feuer.", beginn: "2027-07-21T10:00", ende: "2027-07-21T15:00", ort: "Parkplatz am Stadtwald", kategorie: "Ferienprogramm", ferienprogramm: true, anmeldung: true, plaetze: 15, kosten: "kostenfrei", alter: "6–10 Jahre" },
  ],

  ehrenamt: [
    { id: "stadtfest-helfer", titel: "Helfer/innen für das Stadtfest", organisation: "Stadt Musterstadt", text: "Für den Auf- und Abbau, die Getränkeausgabe und den Kinderbereich suchen wir Unterstützung – schon zwei Stunden helfen.", ort: "Marktplatz", zeit: "Juni 2027, einzelne Schichten", kategorie: "Veranstaltung" },
    { id: "lesepaten", titel: "Lesepatinnen und Lesepaten", organisation: "Grundschule Musterstadt", text: "Einmal pro Woche mit Kindern lesen und ihnen beim Lesenlernen helfen.", ort: "Grundschule", zeit: "1 Stunde pro Woche", kategorie: "Bildung", kontaktEmail: "schule@musterstadt.example" },
    { id: "tafel-fahrer", titel: "Fahrerinnen und Fahrer für die Tafel", organisation: "Musterstädter Tafel", text: "Lebensmittel bei Supermärkten abholen. Führerschein Klasse B genügt.", ort: "Musterstadt", zeit: "vormittags, nach Absprache", kategorie: "Soziales", kontaktEmail: "tafel@musterstadt.example" },
  ],

  friedhoefe: [
    {
      id: "hauptfriedhof",
      name: "Hauptfriedhof",
      adresse: "Friedhofsweg 1",
      lat: 50.6489,
      lng: 9.7401,
      oeffnungszeiten: "April–September 7–20 Uhr, Oktober–März 8–17 Uhr",
      grabarten: [
        { name: "Wahlgrab (Sarg)", ruhezeitJahre: 25, gebuehrEuro: 1125, hinweis: "verlängerbar, 45 € je Jahr" },
        { name: "Reihengrab (Sarg)", ruhezeitJahre: 20, gebuehrEuro: 780 },
        { name: "Urnenwahlgrab", ruhezeitJahre: 20, gebuehrEuro: 720 },
        { name: "Urnengemeinschaftsgrab mit Namensplatte", ruhezeitJahre: 20, gebuehrEuro: 950, hinweis: "Pflege durch die Stadt" },
        { name: "Baumbestattung", ruhezeitJahre: 20, gebuehrEuro: 1200 },
      ],
    },
    { id: "oberdorf", name: "Friedhof Oberdorf", adresse: "Am Kirchberg", lat: 50.6545, lng: 9.7368, oeffnungszeiten: "ganzjährig geöffnet", grabarten: [{ name: "Urnenwahlgrab", ruhezeitJahre: 20, gebuehrEuro: 690 }, { name: "Wahlgrab (Sarg)", ruhezeitJahre: 25, gebuehrEuro: 1050 }] },
  ],

  orte: [
    { id: "rathaus", name: "Rathaus", kategorie: "rathaus", lat: 50.6512, lng: 9.7458, adresse: "Marktplatz 1" },
    { id: "wertstoffhof", name: "Wertstoffhof", kategorie: "wertstoffhof", lat: 50.6452, lng: 9.7531, adresse: "Industriestraße 4", hinweis: "Di und Do 14–18 Uhr, Sa 9–13 Uhr" },
    { id: "aed-rathaus", name: "Defibrillator Rathaus", kategorie: "defibrillator", lat: 50.6513, lng: 9.7455, hinweis: "Im Eingangsbereich, rund um die Uhr zugänglich" },
    { id: "aed-sporthalle", name: "Defibrillator Sporthalle", kategorie: "defibrillator", lat: 50.6537, lng: 9.7415, hinweis: "Außenwand neben dem Haupteingang" },
    { id: "wc-markt", name: "Öffentliche Toilette Marktplatz", kategorie: "toilette", lat: 50.6508, lng: 9.7466, hinweis: "barrierefrei, Euroschlüssel" },
    { id: "spielplatz-park", name: "Spielplatz Stadtpark", kategorie: "spielplatz", lat: 50.6527, lng: 9.7486 },
    { id: "spielplatz-sued", name: "Spielplatz Südfeld", kategorie: "spielplatz", lat: 50.6474, lng: 9.7472 },
    { id: "parkhaus", name: "Parkhaus Altstadt", kategorie: "parken", lat: 50.6501, lng: 9.7441, hinweis: "erste Stunde kostenfrei" },
    { id: "laden-markt", name: "Ladesäule Marktplatz", kategorie: "ladesaeule", lat: 50.6505, lng: 9.7452, hinweis: "2 × 22 kW" },
    { id: "freibad", name: "Freibad", kategorie: "bad", lat: 50.6559, lng: 9.7497, hinweis: "Mai bis September" },
    { id: "buecherei", name: "Stadtbücherei", kategorie: "bibliothek", lat: 50.6515, lng: 9.7471, adresse: "Marktplatz 3" },
  ],

  abfall: {
    arten: [
      { id: "rest", label: "Restmüll", hinweis: "Graue Tonne" },
      { id: "bio", label: "Bioabfall", hinweis: "Braune Tonne" },
      { id: "papier", label: "Altpapier", hinweis: "Blaue Tonne" },
      { id: "gelb", label: "Gelber Sack", hinweis: "Verpackungen aus Kunststoff und Metall" },
    ],
    bezirke: [
      {
        id: "bezirk-1",
        name: "Bezirk 1 – Altstadt",
        strassen: ["Marktplatz", "Hauptstraße", "Kirchgasse", "Rathausplatz", "Schulstraße", "Mühlenweg"],
        termine: {
          rest: { start: "2026-01-05", intervallTage: 14 },
          bio: { start: "2026-01-12", intervallTage: 14 },
          papier: { start: "2026-01-07", intervallTage: 28 },
          gelb: { start: "2026-01-09", intervallTage: 14 },
        },
      },
      {
        id: "bezirk-2",
        name: "Bezirk 2 – Nordviertel",
        strassen: ["Gartenweg", "Lindenallee", "Birkenweg", "Am Sportplatz", "Nordring"],
        termine: {
          rest: { start: "2026-01-06", intervallTage: 14 },
          bio: { start: "2026-01-13", intervallTage: 14 },
          papier: { start: "2026-01-14", intervallTage: 28 },
          gelb: { start: "2026-01-08", intervallTage: 14 },
        },
      },
      {
        id: "bezirk-3",
        name: "Bezirk 3 – Südfeld und Oberdorf",
        strassen: ["Feldstraße", "Wiesengrund", "Bergstraße", "Industriestraße", "Oberdorfer Weg"],
        termine: {
          rest: { start: "2026-01-07", intervallTage: 14 },
          bio: { start: "2026-01-14", intervallTage: 14 },
          papier: { start: "2026-01-21", intervallTage: 28 },
          gelb: { start: "2026-01-15", intervallTage: 14 },
        },
      },
    ],
    feiertagVerschiebung: true,
  },

  maengel: {
    kategorien: [
      { id: "strasse", label: "Schlagloch oder Straßenschaden", amtId: "bauhof" },
      { id: "licht", label: "Straßenbeleuchtung defekt", amtId: "bauhof" },
      { id: "muell", label: "Müll oder wilde Ablagerung", amtId: "bauhof" },
      { id: "spielplatz", label: "Spielplatz oder Grünanlage", amtId: "bauhof" },
      { id: "verkehr", label: "Verkehrsschild, Ampel, Falschparker", amtId: "ordnungsamt" },
      { id: "sonstiges", label: "Etwas anderes", amtId: "ordnungsamt" },
    ],
  },

  lebenslagen: [
    {
      id: "umzug",
      titel: "Ich ziehe um",
      kurz: "Alles, was bei einem Umzug nach oder innerhalb von Musterstadt zu erledigen ist.",
      stichworte: ["umzug", "umziehen", "ziehe um", "neue wohnung", "wohnungswechsel"],
      stichtag: "Tag des Einzugs",
      schritte: [
        { id: "anmelden", titel: "Wohnsitz anmelden", text: "Innerhalb von zwei Wochen nach dem Einzug – gesetzliche Pflicht.", leistungId: "wohnsitz-anmelden", tage: 14 },
        { id: "geber", titel: "Wohnungsgeberbestätigung vom Vermieter holen", text: "Brauchen Sie für die Anmeldung.", tage: 0 },
        { id: "abfall", titel: "Abfallkalender für die neue Adresse einrichten", href: "/abfall", tage: 7 },
        { id: "hund", titel: "Hund in Musterstadt anmelden (falls vorhanden)", leistungId: "hund-anmelden", tage: 14 },
        { id: "kfz", titel: "Fahrzeug ummelden", extern: "Zulassungsstelle des Landkreises", tage: 30 },
        { id: "adressen", titel: "Bank, Versicherungen und Arbeitgeber informieren", extern: "Eigene Erledigung", tage: 14 },
      ],
    },
    {
      id: "geburt",
      titel: "Wir bekommen ein Kind",
      kurz: "Von der Geburtsurkunde bis zum Kindergeld – in der richtigen Reihenfolge.",
      stichworte: ["geburt", "baby", "kind bekommen", "schwanger", "kindergeld", "elterngeld"],
      stichtag: "Tag der Geburt",
      schritte: [
        { id: "beurkunden", titel: "Geburt beim Standesamt beurkunden lassen", text: "Meist meldet die Klinik die Geburt – bringen Sie die Unterlagen innerhalb einer Woche bei.", tage: 7 },
        { id: "urkunde", titel: "Geburtsurkunden bestellen", text: "Sie brauchen sie für Kindergeld, Elterngeld und Krankenkasse.", leistungId: "geburtsurkunde", tage: 10 },
        { id: "krankenkasse", titel: "Kind bei der Krankenkasse anmelden", extern: "Ihre Krankenkasse", tage: 30 },
        { id: "kindergeld", titel: "Kindergeld beantragen", extern: "Familienkasse der Bundesagentur für Arbeit", tage: 60 },
        { id: "elterngeld", titel: "Elterngeld beantragen", text: "Rückwirkend nur für 3 Monate – deshalb früh beantragen.", extern: "Elterngeldstelle des Landes", tage: 90 },
        { id: "ausweis", titel: "Reisepass für das Kind (nur bei Reisen)", leistungId: "reisepass" },
      ],
    },
    {
      id: "neu-hier",
      titel: "Neu in Musterstadt",
      kurz: "Willkommen! Die wichtigsten Schritte für einen guten Start.",
      stichworte: ["neu in", "neubürger", "zugezogen", "neu hier", "willkommen"],
      stichtag: "Tag des Einzugs",
      schritte: [
        { id: "anmelden", titel: "Wohnsitz anmelden", leistungId: "wohnsitz-anmelden", tage: 14 },
        { id: "konto", titel: "Bürgerkonto einrichten und Wohnort hinterlegen", href: "/konto/einstellungen", tage: 14 },
        { id: "abfall", titel: "Abfallkalender einrichten", href: "/abfall", tage: 7 },
        { id: "hund", titel: "Hund anmelden (falls vorhanden)", leistungId: "hund-anmelden", tage: 14 },
        { id: "aktuelles", titel: "Meldungen aus Ihrem Ortsteil abonnieren", href: "/aktuelles" },
      ],
    },
  ],

  // Persönliche Hinweise im Bürgerkonto („Was steht bei mir an?“) – Beispieltermine
  stichtage: [
    {
      id: "hundesteuer",
      titel: "Hundesteuer fällig",
      text: "Die Jahressteuer für Ihren Hund wird am 1. Juli fällig. Mit einem Lastschriftmandat geschieht das automatisch.",
      daten: ["07-01"],
      fuer: "hund",
      vorlaufTage: 14,
      href: "/antrag/lastschrift",
      link: "Lastschrift einrichten",
    },
    {
      id: "grundsteuer",
      titel: "Grundsteuer fällig",
      text: "Die Grundsteuer wird vierteljährlich fällig. Den Betrag finden Sie in Ihrem Grundsteuerbescheid.",
      daten: ["02-15", "05-15", "08-15", "11-15"],
      fuer: "grundbesitz",
      vorlaufTage: 10,
      href: "/antrag/lastschrift",
      link: "Lastschrift einrichten",
    },
    {
      id: "ferienprogramm",
      titel: "Anmeldung Ferienprogramm",
      text: "Die Anmeldung für das Sommer-Ferienprogramm der Stadtjugendpflege beginnt. Plätze sind begrenzt.",
      daten: ["05-02"],
      fuer: "kinder",
      vorlaufTage: 10,
    },
    {
      id: "buergermeisterwahl-2027",
      titel: "Bürgermeisterwahl",
      text: "Sie können bequem per Briefwahl wählen. Die Unterlagen kommen per Post.",
      daten: ["2027-03-14"],
      fuer: "alle",
      vorlaufTage: 45,
    },
  ],

  textbausteine: [
    {
      titel: "Unterlage fehlt",
      text: "Guten Tag,\n\nfür die Bearbeitung fehlt uns noch eine Unterlage. Bitte laden Sie diese über „Meine Anliegen“ hoch.\n\nVielen Dank!",
    },
    {
      titel: "Foto unleserlich",
      text: "Guten Tag,\n\ndas hochgeladene Foto ist leider nicht gut lesbar. Bitte fotografieren Sie das Dokument bei gutem Licht noch einmal vollständig.",
    },
    {
      titel: "Angaben bestätigen",
      text: "Guten Tag,\n\nbitte bestätigen Sie uns kurz die folgenden Angaben: ",
    },
  ],

  email: { absenderName: "Bürgerservice Musterstadt", absenderAdresse: "no-reply@musterstadt.example" },
});
