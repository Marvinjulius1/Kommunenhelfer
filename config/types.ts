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
export type Sprache = "de" | "en";

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

/** Ein Amt / eine Stelle, bei der Termine gebucht werden können. */
export interface Amt {
  id: string;
  name: LText;
  /** Raum, Gebäude o. Ä. */
  ort: LText;
  /** Buchbare Zeitfenster pro Wochentag. */
  terminzeiten: Wochenplan;
  /** Länge eines Termins in Minuten (Standard, kann pro Leistung überschrieben werden). */
  slotMinuten: number;
  /** Wie viele Personen parallel bedient werden (Schalteranzahl). */
  parallel: number;
  /** Frühester Termin: Anzahl Tage ab heute (0 = heute möglich). */
  vorlaufTage: number;
  /** Wie viele Tage im Voraus gebucht werden kann. */
  buchbarTage: number;
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

export interface Schnellaktion {
  label: LText;
  /** Entweder eine Leistung (der Assistent erklärt sie direkt) … */
  leistungId?: string;
  /** … oder ein Satz, der an den Assistenten geht (z. B. "Ich ziehe um" → Rückfrage) … */
  anfrage?: LText;
  /** … oder ein direkter Link (z. B. /termine). */
  href?: string;
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

  texte: {
    /** Untertitel unter dem Namen, z. B. "Bürgerservice online". */
    untertitel: LText;
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
  leistungen: Leistung[];
  rueckfragen: Rueckfrage[];
  schnellaktionen: Schnellaktion[];

  /** Häufige Fragen (erscheinen unter /hilfe und fließen in die Wissensbasis ein). */
  faq: { frage: LText; antwort: LText }[];

  /** E-Mail-Absender für Bestätigungen. */
  email: { absenderName: string; absenderAdresse: string };
}
