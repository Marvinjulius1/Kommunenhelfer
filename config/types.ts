/**
 * Typdefinitionen für die Gemeinde-Konfiguration.
 *
 * Jede Gemeinde wird über GENAU EINE Datei beschrieben:
 *   tenants/<slug>/gemeinde.config.ts
 *
 * Diese Datei definiert das "Vertragsformat" zwischen Konfiguration und
 * Anwendung. Alles, was hier steht, kann pro Gemeinde angepasst werden.
 */

/** Unterstützte Oberflächensprachen. Erweiterbar (z. B. "tr", "uk", "ls" für Leichte Sprache). */
/** de = Deutsch, ls = Leichte Sprache (Deutsch), en/tr/uk/ar/ru = Übersetzungen (ar: von rechts nach links) */
export type Sprache = "de" | "en" | "tr" | "uk" | "ar" | "ru" | "ls";

/**
 * Ein übersetzbarer Text. Entweder ein einfacher (deutscher) String
 * oder ein Objekt mit Übersetzungen. Fehlt eine Übersetzung, wird Deutsch verwendet.
 */
export type LText = string | ({ de: string } & Partial<Record<Exclude<Sprache, "de">, string>>);

/** Öffnungszeiten: Zeitfenster pro Wochentag im Format "HH:MM". */
export type Wochentag = "mo" | "di" | "mi" | "do" | "fr" | "sa" | "so";
export type Zeitfenster = [von: string, bis: string];
export type Wochenplan = Partial<Record<Wochentag, Zeitfenster[]>>;

export interface Kontakt {
  bezeichnung: LText;
  strasse: string;
  plz: string;
  ort: string;
  telefon?: string;
  email?: string;
  /** Freitext, z. B. "Barrierefreier Zugang über den Seiteneingang". */
  hinweis?: LText;
}

/** Buchbare Termine eines Amts. */
export interface Terminangebot {
  /** Buchbare Zeitfenster pro Wochentag. */
  zeiten: Wochenplan;
  /** Länge eines Termins in Minuten. */
  slotMinuten: number;
  /** Wie viele Personen parallel bedient werden (Schalteranzahl). */
  parallel: number;
  /** Frühester Termin: Anzahl Tage ab heute (0 = heute möglich). */
  vorlaufTage: number;
  /** Wie viele Tage im Voraus gebucht werden kann. */
  buchbarTage: number;
}

/**
 * Wohin eingehende Vorgänge (Uploads, Online-Anträge) eines Amts gehen.
 *  - backoffice: nur im Backoffice des Portals (Standard)
 *  - email:      zusätzlich eine Benachrichtigung an das Amt – OHNE Anhänge und ohne
 *                personenbezogene Daten, nur Vorgangsnummer und Link ins Backoffice
 *  - webhook:    JSON an ein Fachverfahren/eine Schnittstelle, signiert (HMAC-SHA256).
 *                Dokumente sind über kurzlebige, signierte Links abrufbar.
 */
export type Weiterleitung =
  | { typ: "backoffice" }
  | { typ: "email"; adresse: string }
  | { typ: "webhook"; url: string; /** Name der Umgebungsvariable mit dem Signatur-Geheimnis */ secretEnv: string }
  /** FIT-Connect-Zustellpunkt der Behörde (Destination-ID aus dem DVDV / Self-Service-Portal) */
  | { typ: "fitconnect"; destinationId: string }
  /**
   * Ablage im Dokumentenmanagement/der E-Akte per WebDAV (z. B. Nextcloud, d.velop, enaio, Windows-Freigabe über WebDAV):
   * je Vorgang ein Ordner mit antrag.pdf, vorgang.json und den Unterlagen. Zugangsdaten aus Umgebungsvariablen.
   */
  | { typ: "webdav"; url: string; benutzerEnv: string; passwortEnv: string };

/** Ein Amt / ein Fachbereich. */
export interface Amt {
  id: string;
  name: LText;
  /** Raum, Gebäude o. Ä. */
  ort: LText;
  /** Stichworte für die Zuständigkeit (z. B. "hundesteuer", "gewerbe"). Hilft beim Vorsortieren von Uploads. */
  zustaendigkeiten?: string[];
  /** Weiterleitung eingehender Vorgänge. Standard: nur Backoffice. */
  weiterleitung?: Weiterleitung;
  /** Hinweis an Bürger zur Bearbeitung, z. B. "In der Regel innerhalb von 5 Werktagen." */
  bearbeitungshinweis?: LText;
  /** Terminbuchung. Fehlt der Eintrag, ist das Amt nicht online buchbar. */
  termine?: Terminangebot;
  /** Bearbeitungsfrist in Werktagen (Fristüberwachung im Backoffice). Standard: 10. */
  bearbeitungTage?: number;
}

// ---------------------------------------------------------------------------
// Formulare (geführte Abläufe)
// ---------------------------------------------------------------------------

export type FeldTyp =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "date"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "iban"
  | "plz";

export interface FeldOption {
  wert: string;
  label: LText;
  hinweis?: LText;
}

export interface Feld {
  id: string;
  typ: FeldTyp;
  label: LText;
  hinweis?: LText;
  pflicht?: boolean;
  optionen?: FeldOption[];
  /** Für Browser-Autofill (WCAG 1.3.5), z. B. "given-name", "email". */
  autocomplete?: string;
  /** Regulärer Ausdruck (als String) für zusätzliche Prüfung. */
  muster?: string;
  musterFehler?: LText;
  min?: number;
  max?: number;
  maxLaenge?: number;
  /** Vorbelegung, z. B. der Ort der Gemeinde. */
  standard?: string;
  /** Feld nur anzeigen, wenn ein anderes Feld einen bestimmten Wert hat. */
  nurWenn?: { feld: string; gleich: string | string[] };
  /** Sensible Daten (z. B. IBAN) werden in der Zusammenfassung maskiert. */
  sensibel?: boolean;
  /** Halbe Breite auf großen Bildschirmen (Layout-Hinweis). */
  halb?: boolean;
}

export interface FormularSchritt {
  id: string;
  titel: LText;
  beschreibung?: LText;
  felder: Feld[];
}

export interface Formular {
  schritte: FormularSchritt[];
  /** Zusätzliche Bestätigungen vor dem Absenden (neben dem Datenschutzhinweis). */
  bestaetigungen?: { id: string; label: LText }[];
  /** Wie lange der Antrag gespeichert bleibt (Löschkonzept), in Tagen. */
  aufbewahrungTage: number;
}

// ---------------------------------------------------------------------------
// Leistungen (Services)
// ---------------------------------------------------------------------------

export interface Gebuehr {
  bezeichnung: LText;
  /** Betrag in Euro. `null` = kostenfrei. Als Text möglich, z. B. "nach Aufwand". */
  betrag: number | null | string;
  hinweis?: LText;
}

/** Eine Unterlage, die für eine Leistung hochgeladen werden soll. */
export interface DokumentAnforderung {
  /** ID einer Dokumentart (Standardliste in lib/uploads/dokumentarten.ts oder `dokumentarten` der Gemeinde). */
  art: string;
  pflicht: boolean;
  hinweis?: LText;
}

/** Zusätzliche, gemeindespezifische Dokumentart. */
export interface Dokumentart {
  id: string;
  label: LText;
  /** Begriffe, an denen die Art in Dateiname oder Dokumenttext erkannt wird. */
  stichworte: string[];
}

export interface Leistung {
  /** Eindeutige ID, wird in URLs verwendet (z. B. /antrag/hund-anmelden). */
  id: string;
  aktiv: boolean;
  titel: LText;
  /** Ein Satz, der beschreibt, worum es geht. Einfache Sprache. */
  kurz: LText;
  /** Ausführlichere Beschreibung (einfache Sprache). */
  beschreibung?: LText;
  /** Suchbegriffe / Synonyme, mit denen Bürger das Anliegen beschreiben. */
  stichworte: string[];
  /** Benötigte Unterlagen. */
  unterlagen: LText[];
  gebuehren: Gebuehr[];
  /** Ablauf in einfachen Schritten. */
  ablauf: LText[];
  /** Fristen (nur was in der Satzung/im Gesetz steht). */
  fristen?: LText[];
  /** Zuständiges Amt (Referenz auf `aemter[].id`). */
  amtId?: string;
  /** Wie kann die Leistung erledigt werden? */
  online: boolean;
  termin: boolean;
  /** Erwartete Dauer für den Online-Antrag, z. B. "ca. 5 Minuten". */
  dauer?: LText;
  /** Geführtes Formular, wenn die Leistung online beantragt werden kann. */
  formular?: Formular;
  /** Gebühr, die direkt online bezahlt wird (z. B. 10 € pro Meldebescheinigung). */
  bezahlung?: {
    betrag: number;
    /** Feld-ID mit der Anzahl (z. B. "anzahl") */
    mengeFeld?: string;
    /** Betrag je weiterer Ausfertigung; ohne Angabe gilt „betrag“ für jede. */
    weitere?: number;
  };
  /** Nur mit Online-Ausweis (Vertrauensniveau "hoch") beantragbar, z. B. elektronischer Wohnsitzwechsel. */
  erfordertOnlineAusweis?: boolean;
  /** Unterlagen, die Bürger hochladen können/müssen. Grundlage der Vollständigkeitsprüfung. */
  dokumente?: DokumentAnforderung[];
  /** Löschfrist für Vorgänge dieser Leistung (Uploads) in Tagen. Standard: uploads.aufbewahrungTage. */
  aufbewahrungTage?: number;
  /** Bearbeitungsfrist in Werktagen – überschreibt die Frist des Amts. */
  bearbeitungTage?: number;
  /** Leistungsschlüssel aus dem LeiKa/FIM-Katalog – für spätere OZG-/XÖV-Anbindung. */
  leistungsschluessel?: string;
  /** Rechtsgrundlage (Anzeige als Quelle). */
  rechtsgrundlage?: LText;
  /** Externer Link (z. B. zu einem bestehenden Online-Dienst des Landes). */
  externerLink?: { label: LText; url: string };
}

/**
 * Rückfragen: Wenn ein Anliegen mehrdeutig ist (z. B. "Umzug"),
 * fragt der Assistent gezielt nach und bietet Optionen an.
 */
export interface Rueckfrage {
  id: string;
  stichworte: string[];
  frage: LText;
  optionen: { label: LText; leistungId: string }[];
}

/**
 * Funktionen des Portals, die eine Gemeinde ein- oder ausschalten kann.
 * Nicht gesetzte Werte nutzen die Standards aus lib/funktionen.ts.
 */
export interface Funktionen {
  /** Bürgerkonto (Registrierung, Profil, Postfach …) */
  konto: boolean;
  /** Anmeldung mit dem Online-Ausweis / BundID */
  onlineAusweis: boolean;
  /** Online-Bezahlung von Gebühren */
  zahlung: boolean;
  maengelmelder: boolean;
  abfall: boolean;
  lebenslagen: boolean;
  /** Umfragen und Ideen */
  beteiligung: boolean;
  ratsinfo: boolean;
  /** Digitale Wartemarken und Live-Wartezeit */
  warteschlange: boolean;
  videoBeratung: boolean;
  fundbuero: boolean;
  ausweisStatus: boolean;
  /** Push-Benachrichtigungen (Web Push) */
  push: boolean;
  /** Antworten vorlesen (läuft lokal im Browser) */
  vorlesen: boolean;
  /**
   * Spracheingabe. Standard AUS: Browser wie Chrome verarbeiten Sprache auf
   * Servern des Browser-Herstellers – vorher datenschutzrechtlich prüfen.
   */
  spracheingabe: boolean;
  /** „Was steht bei mir an?“ – persönliche Hinweise im Konto */
  hinweise: boolean;
  /** Status-Nachrichten per SMS (auch ohne Konto) */
  sms: boolean;
  /** Status-Nachrichten per WhatsApp (nur mit WhatsApp-Business-Gateway in der EU) */
  whatsapp: boolean;
  /** Zufriedenheit nach Antrag und Bearbeitung abfragen (1 Klick) */
  feedback: boolean;
  /** Kita-Platz-Börse (braucht `kitas`) */
  kita: boolean;
  /** Veranstaltungen mit Anmeldung, Ferienprogramm, Vereinsverzeichnis */
  veranstaltungen: boolean;
  ehrenamt: boolean;
  buergerhaushalt: boolean;
  /** Verwarnungsgeld bezahlen oder Stellung nehmen */
  parken: boolean;
  /** Friedhöfe, Grabarten, Nutzungsrecht verlängern (braucht `friedhoefe`) */
  friedhof: boolean;
  /** Stadtkarte mit Orten, Baustellen und Mängeln */
  karte: boolean;
  /** Warnbanner und amtliche Warnungen (NINA, braucht `ars`) */
  warnungen: boolean;
  /** Backoffice: Entwürfe für Rückfragen und Bescheide */
  kiEntwurf: boolean;
  /** Backoffice: eigene Online-Formulare */
  formularBaukasten: boolean;
  /** Backoffice: Wirkungsbericht als PDF */
  wirkungsbericht: boolean;
  /** Backoffice: Auslastungsprognose */
  auslastung: boolean;
}

/** Vertragspaket (siehe lib/funktionen.ts). Einzelne Funktionen lassen sich mit `funktionen` zusätzlich an- oder abschalten. */
export type Paket = "basis" | "komfort" | "premium";

export interface Kita {
  id: string;
  name: string;
  traeger: string;
  adresse: string;
  ortsteil?: string;
  lat?: number;
  lng?: number;
  /** u3 = unter 3 Jahren (Krippe), ue3 = ab 3 (Kindergarten), hort = Schulkinder */
  altersgruppen: ("u3" | "ue3" | "hort")[];
  plaetze: number;
  oeffnungszeiten?: string;
  profil?: string;
}

export interface Verein {
  id: string;
  name: string;
  kategorie: string;
  kurz: string;
  web?: string;
  /** Kontakt für Anfragen über das Portal – wird nie öffentlich angezeigt */
  kontaktEmail?: string;
}

/** Feste Termine aus der Config (weitere legt die Redaktion im Backoffice an). */
export interface VeranstaltungConfig {
  id: string;
  titel: string;
  text: string;
  /** "JJJJ-MM-TTTHH:MM" Ortszeit */
  beginn: string;
  ende?: string;
  ort: string;
  kategorie: string;
  vereinId?: string;
  ferienprogramm?: boolean;
  /** Mit Anmeldung über das Portal; ohne Angabe von Plätzen unbegrenzt */
  anmeldung?: boolean;
  plaetze?: number;
  kosten?: string;
  alter?: string;
}

export interface EhrenamtConfig {
  id: string;
  titel: string;
  organisation: string;
  text: string;
  ort: string;
  zeit: string;
  kategorie: string;
  kontaktEmail?: string;
  /** Gesuch endet (ISO-Datum) */
  bis?: string;
}

export interface Friedhof {
  id: string;
  name: string;
  adresse: string;
  lat?: number;
  lng?: number;
  oeffnungszeiten?: string;
  grabarten: { name: string; ruhezeitJahre: number; gebuehrEuro?: number; hinweis?: string }[];
}

export type OrtKategorie = "wertstoffhof" | "defibrillator" | "toilette" | "spielplatz" | "parken" | "ladesaeule" | "rathaus" | "bad" | "bibliothek" | "sonstiges";

export interface Ort {
  id: string;
  name: string;
  kategorie: OrtKategorie;
  lat: number;
  lng: number;
  adresse?: string;
  hinweis?: string;
}

/**
 * Wiederkehrende oder einmalige Stichtage für persönliche Hinweise,
 * z. B. „Hundesteuer fällig am 15.02.“ oder „Bundestagswahl – Briefwahl beantragen“.
 */
export interface Stichtag {
  id: string;
  titel: LText;
  text?: LText;
  /** Jährlich ("MM-TT") oder einmalig ("JJJJ-MM-TT") */
  daten: string[];
  /** Wen betrifft es? Haushaltsangaben macht der Bürger freiwillig im Konto. */
  fuer: "alle" | "hund" | "grundbesitz" | "kinder";
  /** Ab wie vielen Tagen vorher der Hinweis erscheint */
  vorlaufTage: number;
  href?: string;
  link?: LText;
}

/**
 * Annahmen für den Wirkungsbericht. Bewusst konservativ und für die Gemeinde
 * sichtbar – der Bericht nennt sie immer mit.
 */
export interface Wirkungsannahmen {
  /** Eingesparte Arbeitszeit je Online-Antrag gegenüber Papier/Schalter (Minuten) */
  minutenProAntrag: number;
  /** Eingesparte Zeit je online gebuchtem Termin (Telefonat entfällt) */
  minutenProTermin: number;
  /** Eingesparte Zeit je sicher beantworteter Frage an den Assistenten (Anruf entfällt) */
  minutenProAuskunft: number;
  /** Porto + Druck je digital zugestelltem Bescheid (Cent) */
  portoCent: number;
  /** Kosten einer Arbeitsstunde (Euro, z. B. nach KGSt-Bericht) */
  stundensatzEuro: number;
}

// ---------------------------------------------------------------------------
// Erweiterte Portal-Funktionen
// ---------------------------------------------------------------------------

export interface AbfallConfig {
  arten: { id: string; label: LText; hinweis?: LText }[];
  bezirke: {
    id: string;
    name: string;
    strassen: string[];
    /** Erste Abfuhr im Jahr und Rhythmus in Tagen, je Abfallart */
    termine: Record<string, { start: string; intervallTage: number }>;
  }[];
  /** Fällt die Abfuhr auf einen Feiertag, verschiebt sie sich um einen Tag. */
  feiertagVerschiebung: boolean;
}

/** Lebenslage: eine persönliche Checkliste über alle Ämter hinweg ("Ich bekomme ein Kind"). */
export interface Lebenslage {
  id: string;
  titel: LText;
  kurz: LText;
  stichworte: string[];
  /** Beschriftung des Stichtags, z. B. "Tag des Umzugs" */
  stichtag: LText;
  schritte: {
    id: string;
    titel: LText;
    text?: LText;
    leistungId?: string;
    href?: string;
    /** Frist relativ zum Stichtag in Tagen (negativ = vorher) */
    tage?: number;
    /** Zuständig ist eine andere Stelle (z. B. Familienkasse) */
    extern?: LText;
  }[];
}

export interface MaengelConfig {
  kategorien: { id: string; label: LText; amtId: string }[];
}

/** Sitzungen des Gemeinderats (statisch oder über die OParl-Schnittstelle des Ratsinformationssystems). */
export interface RatsinfoConfig {
  /** OParl-System-URL, z. B. https://ratsinfo.example.de/oparl/v1.1/system */
  oparlUrl?: string;
  sitzungen?: {
    id: string;
    gremium: string;
    datum: string;
    ort: string;
    tagesordnung: { titel: string; kurz?: string; beschluss?: string }[];
    /** Livestream der Sitzung (öffnet in neuem Fenster – keine eingebetteten Fremdinhalte) */
    livestream?: string;
    aufzeichnung?: string;
  }[];
}

export interface Fundsache {
  id: string;
  bezeichnung: string;
  beschreibung: string;
  fundort: string;
  funddatum: string;
  kategorie: string;
}

export interface GemeindeConfig {
  /** Technischer Kurzname, entspricht dem Ordnernamen und der Subdomain. */
  slug: string;
  name: string;
  /** Art der Kommune, z. B. "Stadt", "Gemeinde", "Markt". */
  art: string;
  /** Pfad zum Wappen/Logo unter /public (SVG empfohlen, PNG möglich). */
  wappen: string;
  /** Alternativtext für das Wappen. */
  wappenAlt: string;
  /**
   * Akzentfarbe (Hex). Wird für Buttons, Fokus-Ringe und Links genutzt.
   * Muss auf Weiß einen Kontrast von mind. 4.5:1 haben (WCAG AA) –
   * `npm run tenant:check` prüft das.
   */
  akzentfarbe: string;
  /** Optionale hellere Variante für den Dunkelmodus (Kontrast auf Schwarz ≥ 4.5:1). */
  akzentfarbeDunkel?: string;

  sprachen: Sprache[];
  standardSprache: Sprache;

  /** Vertragspaket – bestimmt die Standardfunktionen. Ohne Angabe: alle Standardfunktionen. */
  paket?: Paket;
  /** Einwohnerzahl (für den Preis und den Wirkungsbericht) */
  einwohner?: number;
  /** Welche Portal-Funktionen diese Gemeinde anbietet (Standard: fast alle an). */
  funktionen?: Partial<Funktionen>;

  texte: {
    /** Schrift unter dem Wappen auf der Startseite. Standard: "Bürgerservice online". */
    untertitel?: LText;
    /** Platzhalter im Eingabefeld. */
    platzhalter: LText;
    /** Erste Antwort des Assistenten, falls benötigt. */
    begruessung: LText;
  };

  kontakt: Kontakt;
  oeffnungszeiten: Wochenplan;
  /** Hinweise zu den Öffnungszeiten, z. B. "Donnerstag nur mit Termin". */
  oeffnungszeitenHinweis?: LText;
  /** Tage, an denen keine Termine möglich sind (ISO-Datum "YYYY-MM-DD"). */
  schliesstage: string[];

  rechtliches: {
    impressumUrl: string;
    /** Externe Datenschutzerklärung der Gemeinde. Die Seite /datenschutz ergänzt sie für das Portal. */
    datenschutzUrl: string;
    /** Verantwortliche Stelle & Datenschutzbeauftragte(r). */
    verantwortlich: string;
    datenschutzbeauftragter: string;
    /** Kontakt für Barrierefreiheits-Feedback (BITV 2.0 Pflicht). */
    barrierefreiheitKontakt: string;
  };

  aemter: Amt[];

  /** Dokumenten-Upload im Assistenten. */
  uploads: {
    aktiv: boolean;
    /** Maximale Größe pro Datei in MB. */
    maxDateiMB: number;
    /** Maximale Gesamtgröße pro Vorgang in MB. */
    maxGesamtMB: number;
    /** Maximale Anzahl Dateien pro Vorgang. */
    maxDateien: number;
    /** Standard-Löschfrist für Vorgänge mit Uploads (Tage). */
    aufbewahrungTage: number;
    /** Amt, an das Unterlagen gehen, wenn die Zuständigkeit unklar ist (z. B. zentrale Poststelle). */
    standardAmtId: string;
  };
  /** Ortsteile (für Meldungen und Push-Benachrichtigungen nach Wohnort) */
  ortsteile?: string[];
  abfall?: AbfallConfig;
  lebenslagen?: Lebenslage[];
  maengel?: MaengelConfig;
  ratsinfo?: RatsinfoConfig;
  /** Fundsachen im Fundbüro (Beispieldaten; im Echtbetrieb aus dem Fachverfahren) */
  fundsachen?: Fundsache[];
  /** Video-Beratung: Basis-URL eines Jitsi-Servers in der EU, z. B. https://meet.example.de */
  videoBeratung?: { url: string; aemter: string[] };
  kitas?: Kita[];
  vereine?: Verein[];
  veranstaltungen?: VeranstaltungConfig[];
  ehrenamt?: EhrenamtConfig[];
  friedhoefe?: Friedhof[];
  /** Orte für die Stadtkarte (Wertstoffhof, Defibrillatoren, Toiletten …) */
  orte?: Ort[];
  /** Kartenmitte und Zoomstufe der Stadtkarte */
  karte?: { mitte: [lat: number, lng: number]; zoom: number };
  /**
   * Zugehöriger Landkreis. Leistungen des Kreises (Kfz, Führerschein, Bauantrag …)
   * werden dann aus dem Gemeindeportal heraus gefunden und verlinkt.
   */
  landkreis?: { slug: string; name: string; url?: string };
  /** Nur für Landkreise: die kreisangehörigen Gemeinden (mit eigenem Portal oder Website) */
  gemeinden?: { slug?: string; name: string; plz: string[]; url?: string }[];
  /** Öffentliche Ausschreibungen (Bekanntmachungen; Angebote laufen über die Vergabeplattform) */
  ausschreibungen?: { id: string; titel: string; kurz: string; vergabeart: string; frist: string; link: string }[];
  /** Amtlicher Regionalschlüssel (12 Stellen) – für amtliche Warnungen über NINA */
  ars?: string;
  /** Stichtage für persönliche Hinweise im Bürgerkonto */
  stichtage?: Stichtag[];
  /** Annahmen für den Wirkungsbericht (Standard siehe lib/wirkung.ts) */
  wirkung?: Partial<Wirkungsannahmen>;
  /** Textbausteine für Rückfragen im Backoffice. */
  textbausteine?: { titel: string; text: string }[];
  /** Ergänzt die Standard-Dokumentarten. */
  dokumentarten?: Dokumentart[];
  leistungen: Leistung[];
  rueckfragen: Rueckfrage[];

  /** Häufige Fragen (erscheinen unter /hilfe und fließen in die Wissensbasis ein). */
  faq: { frage: LText; antwort: LText }[];

  /** E-Mail-Absender für Bestätigungen. */
  email: { absenderName: string; absenderAdresse: string };
}
