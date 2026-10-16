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
import { defineGemeinde, type Feld, type FormularSchritt } from "@/config/define";

// ---------------------------------------------------------------------------
// Wiederverwendbare Formular-Bausteine
// ---------------------------------------------------------------------------

const ORT = "Musterstadt";
const PLZ = "12345";

/** Persönliche Angaben – wird in mehreren Formularen genutzt. */
const person: Feld[] = [
  { id: "vorname", typ: "text", label: "Vorname", pflicht: true, autocomplete: "given-name", maxLaenge: 80, halb: true },
  { id: "nachname", typ: "text", label: "Nachname", pflicht: true, autocomplete: "family-name", maxLaenge: 80, halb: true },
  { id: "geburtsdatum", typ: "date", label: "Geburtsdatum", pflicht: true, autocomplete: "bday" },
];

const anschrift: Feld[] = [
  { id: "strasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, autocomplete: "street-address", maxLaenge: 120 },
  { id: "plz", typ: "plz", label: "Postleitzahl", pflicht: true, autocomplete: "postal-code", standard: PLZ, halb: true },
  { id: "ort", typ: "text", label: "Ort", pflicht: true, autocomplete: "address-level2", standard: ORT, halb: true },
];

const erreichbarkeit: Feld[] = [
  {
    id: "email",
    typ: "email",
    label: "E-Mail-Adresse",
    hinweis: "Hierhin senden wir die Eingangsbestätigung.",
    pflicht: true,
    autocomplete: "email",
  },
  { id: "telefon", typ: "tel", label: "Telefon (freiwillig)", hinweis: "Nur für Rückfragen.", autocomplete: "tel" },
];

const kontaktSchritt: FormularSchritt = {
  id: "kontakt",
  titel: "Ihre Angaben",
  beschreibung: "Wir benötigen Ihren Namen und Ihre Anschrift.",
  felder: [...person, ...anschrift, ...erreichbarkeit],
};

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

  sprachen: ["de", "en"],
  standardSprache: "de",

  texte: {
    untertitel: { de: "Bürgerservice online", en: "Online citizen services" },
    platzhalter: { de: "Wie kann ich Ihnen helfen?", en: "How can I help you?" },
    begruessung: {
      de: "Guten Tag. Beschreiben Sie Ihr Anliegen in einem Satz – ich zeige Ihnen den Weg.",
      en: "Hello. Describe your request in one sentence – I will show you the way.",
    },
  },

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
    },
    {
      id: "bauhof",
      name: "Bauhof",
      ort: "Industriestraße 4",
      zustaendigkeiten: ["bauhof", "straße", "schlagloch", "straßenbeleuchtung", "laterne", "spielplatz", "grünanlage", "winterdienst", "müll"],
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
  leistungen: [
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
      kurz: "Nach einem Umzug nach oder innerhalb von Musterstadt müssen Sie sich innerhalb von zwei Wochen anmelden.",
      beschreibung:
        "Die Anmeldung erfolgt persönlich im Bürgerbüro. Bitte buchen Sie dafür einen Termin. Auch Ihr Personalausweis wird dabei aktualisiert.",
      stichworte: ["umzug", "umziehen", "anmelden", "ummelden", "ummeldung", "wohnsitz", "neue wohnung", "zuzug", "adresse ändern", "meldeadresse", "eingezogen"],
      unterlagen: [
        "Personalausweis oder Reisepass aller Personen, die umziehen",
        "Wohnungsgeberbestätigung (erhalten Sie von Ihrer Vermieterin / Ihrem Vermieter)",
        "Bei Kindern: Geburtsurkunde, falls kein Ausweis vorhanden ist",
      ],
      gebuehren: [{ bezeichnung: "Anmeldung", betrag: null }],
      ablauf: [
        "Sie buchen online einen Termin im Bürgerbüro.",
        "Sie bringen die Unterlagen mit.",
        "Wir melden Sie an und aktualisieren Ihren Ausweis.",
        "Sie erhalten eine Meldebestätigung.",
      ],
      fristen: ["Innerhalb von 2 Wochen nach dem Einzug (§ 17 Bundesmeldegesetz)."],
      amtId: "buergerbuero",
      dokumente: [
        { art: "wohnungsgeberbestaetigung", pflicht: true },
        { art: "personalausweis", pflicht: true, hinweis: "Oder Reisepass" },
      ],
      online: false,
      termin: true,
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
  ],

  // -------------------------------------------------------------------------
  // Rückfragen bei mehrdeutigen Anliegen
  // -------------------------------------------------------------------------
  rueckfragen: [
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
