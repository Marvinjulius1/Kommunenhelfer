/**
 * Datensätze im Speicher.
 * Personenbezogene Inhalte stehen ausschließlich verschlüsselt in Feldern
 * vom Typ `Verschluesselt` (AES-256-GCM, lib/crypto.ts).
 */
import type { StoredRecord } from "@/lib/storage/store";
import type { Dateityp } from "@/lib/uploads/formate";

/** Verschlüsselter JSON-Wert ("v1.<iv>.<tag>.<daten>") */
export type Verschluesselt = string;

export type VorgangStatus = "eingegangen" | "in_bearbeitung" | "rueckfrage" | "erledigt";
export const VORGANG_STATUS: VorgangStatus[] = ["eingegangen", "in_bearbeitung", "rueckfrage", "erledigt"];

export interface DokumentMeta {
  /** ID der verschlüsselten Datei im Blob-Speicher */
  id: string;
  art: string;
  typ: Dateityp;
  groesse: number;
  seiten?: number;
  /** Verschlüsselt: bereinigter Dateiname */
  name: Verschluesselt;
}

/** Inhalt von VorgangRecord.daten (verschlüsselt) */
export interface VorgangDaten {
  kontakt: { name: string; email: string; telefon?: string };
  /** Formularwerte (bei Online-Anträgen) */
  werte?: Record<string, string>;
  /** Freitext des Bürgers */
  nachricht?: string;
  /** Für wen der Antrag gestellt wurde, z. B. „Kind: Mia, vertreten durch …“ oder „Im Auftrag von …“ */
  fuer?: string;
}

export interface Nachricht {
  von: "amt" | "buerger";
  text: string;
  am: string;
  /** Benutzername im Backoffice (nur bei "amt") */
  benutzer?: string;
}

export interface VorgangRecord extends StoredRecord {
  quelle: "formular" | "upload" | "mangel";
  /** Bürgerkonto, falls angemeldet eingereicht */
  kontoId?: string;
  /** Bearbeitung durch (Backoffice-Benutzer) */
  zugewiesen?: string;
  /** Verknüpfter Termin (Unterlagen-Check vor dem Termin) */
  terminId?: string;
  /** Öffentliche, nicht personenbezogene Angaben einer Mängelmeldung */
  mangel?: { kategorie: string; lat?: number; lng?: number; ort: string; fotoId?: string };
  leistungId?: string;
  leistungsschluessel?: string;
  amtId: string;
  status: VorgangStatus;
  verlauf: { status: VorgangStatus; am: string; benutzer?: string }[];
  tokenHash: string;
  daten: Verschluesselt;
  dokumente: DokumentMeta[];
  /** Verschlüsselt: Nachricht[] (Rückfragen und Antworten) */
  nachrichten: Verschluesselt;
  einwilligungAm: string;
  /** Eingereicht durch eine bevollmächtigte Person oder ein Firmenmitglied */
  vertreterKontoId?: string;
  /** Wiedervorlage im Backoffice (Notiz verschlüsselt) */
  wiedervorlage?: { am: string; notiz?: Verschluesselt; benutzer: string };
  /** Verschlüsselt: Kanaele[] – Status-Nachrichten per SMS/WhatsApp/E-Mail, auch ohne Konto */
  benachrichtigung?: Verschluesselt;
  /** Zufriedenheit wurde schon abgefragt/abgegeben */
  bewertet?: boolean;
  /** Ergebnis der Weiterleitung an das Amt */
  weiterleitung?: { typ: string; ok: boolean; am: string; /** z. B. Submission-ID bei FIT-Connect */ referenz?: string };
}

/** Zwischengespeicherter Upload (vor dem Absenden, Löschung nach 24 h). */
export interface UploadRecord extends StoredRecord {
  entwurf: string;
  typ: Dateityp;
  groesse: number;
  sha256: string;
  seiten?: number;
  art: string;
  artSicher: boolean;
  amtVorschlag?: string;
  name: Verschluesselt;
  einwilligungAm: string;
}

export type TerminStatus = "gebucht" | "storniert";

export interface TerminRecord extends StoredRecord {
  amtId: string;
  kontoId?: string;
  /** Video-Beratung: Link zum Videoraum */
  videoLink?: string;
  leistungId?: string;
  /** "YYYY-MM-DDTHH:MM" Ortszeit Berlin */
  slot: string;
  status: TerminStatus;
  tokenHash: string;
  /** Verschlüsselt: { name, email, hinweis } */
  daten: Verschluesselt;
}

export interface AuditRecord extends StoredRecord {
  benutzer: string;
  aktion:
    | "anmeldung"
    | "anmeldung_fehlgeschlagen"
    | "vorgang_geoeffnet"
    | "dokument_geoeffnet"
    | "dokument_extern_abgerufen"
    | "status_geaendert"
    | "rueckfrage_gesendet"
    | "bescheid_zugestellt"
    | "zahlung_angefordert"
    | "zugewiesen"
    | "inhalt_geaendert"
    | "meldung_veroeffentlicht"
    | "meldung_entfernt"
    | "fund_erfasst"
    | "fund_geaendert"
    | "ausweis_status"
    | "wartenummer_aufgerufen"
    | "beteiligung"
    | "anpassung"
    | "vertretung"
    | "wiedervorlage"
    | "entwurf_erstellt"
    | "formular_geaendert"
    | "kita"
    | "veranstaltung"
    | "ehrenamt"
    | "buergerhaushalt"
    | "verwarnung"
    | "vorgang_exportiert"
    | "kassen_export"
    | "krisenmodus"
    | "briefwahl"
    | "leistungen_importiert";
  vorgangId?: string;
  dokumentId?: string;
  details?: string;
}

// ---------------------------------------------------------------------------
// Bürgerkonto
// ---------------------------------------------------------------------------

export interface KontoRecord extends StoredRecord {
  /** HMAC der E-Mail-Adresse – zum Auffinden, ohne die Adresse im Klartext zu speichern */
  emailIndex?: string;
  passwortHash?: string;
  /** Pseudonym aus dem Online-Ausweis/BundID (gehasht) */
  eidIndex?: string;
  vertrauensniveau: "basis" | "hoch";
  emailBestaetigt: boolean;
  /** Verschlüsselt: Profil */
  profil: Verschluesselt;
  einstellungen: import("@/lib/konto/types").Einstellungen;
  letzteAnmeldung: string;
  /** Bereits versandte Erinnerungen (z. B. "ausweis-90:2027-03-01"), damit nichts doppelt kommt */
  erinnerungen?: string[];
  /** Person (Standard) oder Unternehmen/Verein – Organisationen haben keinen eigenen Login */
  art?: "person" | "organisation";
  organisation?: { rechtsform?: string };
  /** Ausgeblendete Hinweise („Was steht bei mir an?“) – IDs enthalten das Datum, Wiederkehrendes erscheint im nächsten Jahr neu */
  ausgeblendet?: string[];
}

export interface SitzungRecord extends StoredRecord {
  kontoId: string;
  /** Grobe Geräteangabe zur Anzeige ("Chrome auf Android") */
  geraet: string;
}

// ---------------------------------------------------------------------------
// Postfach, Zahlungen, Dokumentensafe
// ---------------------------------------------------------------------------

export interface PostfachRecord extends StoredRecord {
  kontoId?: string;
  vorgangId?: string;
  art: "bescheid" | "nachricht" | "erinnerung" | "meldung" | "zahlung";
  /** Verschlüsselt: { titel, text } */
  inhalt: Verschluesselt;
  dokument?: { id: string; typ: import("@/lib/uploads/formate").Dateityp; groesse: number; name: Verschluesselt };
  /** Zeitpunkt des ersten Öffnens (Zugangsnachweis) */
  gelesenAm?: string;
  absender: string;
}

export type ZahlungStatus = "offen" | "bezahlt" | "abgebrochen";

export interface ZahlungRecord extends StoredRecord {
  kontoId?: string;
  vorgangId?: string;
  betragCent: number;
  zweck: string;
  status: ZahlungStatus;
  anbieter: string;
  methode?: string;
  referenz?: string;
  bezahltAm?: string;
  /** Wofür gezahlt wird, wenn es kein Vorgang ist (z. B. Verwarnungsgeld) */
  bezug?: { art: "verwarnung"; id: string };
}

export interface SafeRecord extends StoredRecord {
  kontoId: string;
  art: string;
  typ: import("@/lib/uploads/formate").Dateityp;
  groesse: number;
  seiten?: number;
  sha256: string;
  name: Verschluesselt;
}

export interface PushRecord extends StoredRecord {
  kontoId?: string;
  /** Verschlüsselt: PushSubscription (Endpoint + Schlüssel) */
  abo: Verschluesselt;
  endpointHash: string;
  themen: ("konto" | "abfall" | "meldungen")[];
  abfallBezirk?: string;
  ortsteil?: string;
}

// ---------------------------------------------------------------------------
// Lebenslagen, Meldungen, geplante Aufgaben
// ---------------------------------------------------------------------------

/** Persönliche Checkliste zu einer Lebenslage. Inhalt verschlüsselt – Lebenslagen sind sensibel (z. B. Geburt). */
export interface ChecklisteRecord extends StoredRecord {
  kontoId: string;
  /** Verschlüsselt: ChecklisteInhalt */
  inhalt: Verschluesselt;
}

export interface ChecklisteInhalt {
  lebenslageId: string;
  /** Stichtag (ISO-Datum) */
  stichtag: string;
  erledigt: string[];
  /** Schritte, zu denen schon erinnert wurde */
  erinnert: string[];
}

/** Öffentliche Meldung der Verwaltung (Straßensperrung, Wasserrohrbruch …) */
export interface MeldungRecord extends StoredRecord {
  titel: string;
  text: string;
  /** Ohne Angabe: gesamte Gemeinde */
  ortsteil?: string;
  gueltigBis: string;
  autor: string;
  wichtig: boolean;
  /** Warnstufe: gefahr/warnung erscheinen als Banner auf allen Seiten */
  stufe?: "info" | "warnung" | "gefahr";
  kategorie?: "verkehr" | "baustelle" | "wasser" | "strom" | "unwetter" | "hochwasser" | "sonstiges";
  /** Ort für die Stadtkarte (z. B. Baustelle, Sperrung) */
  lat?: number;
  lng?: number;
}

/** Merker, dass eine geplante Aufgabe (z. B. Abfall-Erinnerung für einen Tag) erledigt ist. */
export interface CronLaufRecord extends StoredRecord {
  aufgabe: string;
  ergebnis: number;
}

// ---------------------------------------------------------------------------
// Fundbüro, Ausweis-Status, Wartenummern
// ---------------------------------------------------------------------------

export interface FundRecord extends StoredRecord {
  bezeichnung: string;
  kategorie: string;
  /** Öffentliche, nicht identifizierende Beschreibung (Erkennungsmerkmale bleiben intern) */
  beschreibung: string;
  fundort: string;
  funddatum: string;
  status: "offen" | "abgeholt";
  /** Verschlüsselt: interne Merkmale zur Prüfung von Ansprüchen */
  intern?: Verschluesselt;
  erfasstVon: string;
}

/** Status eines beantragten Ausweises. Die Antragsnummer liegt nur als HMAC vor. */
export interface AusweisRecord extends StoredRecord {
  nummerIndex: string;
  art?: "personalausweis" | "reisepass" | "kinderreisepass" | "eat";
  status: "unbekannt" | "in_produktion" | "abholbereit" | "abgeholt";
  kontoIds: string[];
  abholbereitAm?: string;
  /** Verschlüsselt: Kanaele[] – Benachrichtigung ohne Konto (SMS/E-Mail) */
  kontakte?: Verschluesselt;
}

/** Kanal für Status-Nachrichten. Ziel = Telefonnummer (E.164) oder E-Mail-Adresse. */
export interface Kanal {
  kanal: "sms" | "whatsapp" | "email";
  ziel: string;
}

/** Zufriedenheit (1–5). Ohne Personenbezug; Freitext verschlüsselt, Löschung nach 1 Jahr. */
export interface FeedbackRecord extends StoredRecord {
  note: 1 | 2 | 3 | 4 | 5;
  anlass: "antrag" | "erledigt" | "termin" | "allgemein";
  leistungId?: string;
  amtId?: string;
  /** Verschlüsselt: Freitext */
  text?: Verschluesselt;
}

export interface WarteRecord extends StoredRecord {
  amtId: string;
  datum: string;
  nummer: number;
  status: "wartend" | "aufgerufen" | "erledigt" | "nicht_erschienen" | "storniert";
  tokenHash: string;
  kontoId?: string;
  aufgerufenAm?: string;
  erledigtAm?: string;
  schalter?: string;
  vorgemerkt?: boolean;
}

// ---------------------------------------------------------------------------
// Beteiligung, Vertretung
// ---------------------------------------------------------------------------

/** Umfrage. Stimmen nur als Summen; Teilnahme als HMAC je Umfrage (kein Rückschluss auf das Konto). */
export interface UmfrageRecord extends StoredRecord {
  titel: string;
  beschreibung: string;
  optionen: { id: string; label: string }[];
  mehrfach: boolean;
  bis: string;
  ortsteil?: string;
  ergebnisSofort: boolean;
  nurOnlineAusweis: boolean;
  stimmen: Record<string, number>;
  teilnahmen: string[];
  autor: string;
  beendet?: boolean;
}

export interface IdeeRecord extends StoredRecord {
  titel: string;
  text: string;
  kategorie: string;
  ortsteil?: string;
  /** HMAC des Kontos – zum Verhindern von Selbst-Unterstützung, nicht rückführbar */
  autorIndex: string;
  /** Konto für Benachrichtigungen (wird beim Löschen des Kontos entfernt) */
  kontoId?: string;
  status: "eingereicht" | "veroeffentlicht" | "abgelehnt" | "in_pruefung" | "umgesetzt";
  antwort?: string;
  unterstuetzer: string[];
  geprueftVon?: string;
}

export interface VertretungRecord extends StoredRecord {
  benutzer: string;
  vertreter: string;
  von: string;
  bis: string;
}

// ---------------------------------------------------------------------------
// Kita-Börse, Veranstaltungen, Ehrenamt, Bürgerhaushalt, Verwarnungen
// ---------------------------------------------------------------------------

export type KitaStatus = "wartend" | "angebot" | "zugesagt" | "abgesagt" | "zurueckgezogen";

/** Betreuungswunsch eines Kontos für ein Kind. Personendaten des Kindes verschlüsselt. */
export interface KitaWunschRecord extends StoredRecord {
  kontoId: string;
  altersgruppe: "u3" | "ue3" | "hort";
  /** Gewünschter Beginn (JJJJ-MM) */
  beginn: string;
  /** Wunsch-Kitas in Reihenfolge der Priorität */
  kitas: string[];
  status: Record<string, KitaStatus>;
  angebot?: { kitaId: string; bis: string };
  /** Verschlüsselt: { vorname, geburtsdatum, stunden, hinweis } */
  inhalt: Verschluesselt;
}

export interface VeranstaltungRecord extends StoredRecord {
  titel: string;
  text: string;
  beginn: string;
  ende?: string;
  ort: string;
  kategorie: string;
  vereinId?: string;
  ferienprogramm?: boolean;
  anmeldung?: boolean;
  plaetze?: number;
  kosten?: string;
  alter?: string;
  autor: string;
}

export interface AnmeldungRecord extends StoredRecord {
  veranstaltungId: string;
  anzahl: number;
  status: "angemeldet" | "warteliste" | "storniert";
  tokenHash: string;
  kontoId?: string;
  /** Verschlüsselt: { name, email, telefon?, hinweis? } */
  daten: Verschluesselt;
}

export interface EhrenamtRecord extends StoredRecord {
  titel: string;
  organisation: string;
  text: string;
  ort: string;
  zeit: string;
  kategorie: string;
  kontaktEmail?: string;
  bis?: string;
  autor: string;
}

/** „Ich helfe mit“ – an die Organisation weitergeleitet, nach 90 Tagen gelöscht. */
export interface InteresseRecord extends StoredRecord {
  ehrenamtId: string;
  /** Verschlüsselt: { name, email, telefon?, text } */
  daten: Verschluesselt;
}

/** Bürgerhaushalt: Budget auf Projekte verteilen. Stimmen nur als Summen, Teilnahme als HMAC. */
export interface BuergerhaushaltRecord extends StoredRecord {
  titel: string;
  text: string;
  budgetEuro: number;
  bis: string;
  projekte: { id: string; titel: string; text: string; kostenEuro: number; ortsteil?: string }[];
  stimmen: Record<string, number>;
  teilnahmen: string[];
  nurOnlineAusweis: boolean;
  autor: string;
  beendet?: boolean;
}

/** Verwarnungsgeld (ruhender Verkehr). Das Kennzeichen liegt nur als HMAC vor. */
export interface VerwarnungRecord extends StoredRecord {
  aktenzeichen: string;
  kennzeichenIndex: string;
  betragCent: number;
  tatbestand: string;
  tatzeit: string;
  tatort: string;
  status: "offen" | "bezahlt" | "stellungnahme";
  zahlungId?: string;
  vorgangId?: string;
  erfasstVon: string;
}

// ---------------------------------------------------------------------------
// Vollmachten, Familie, Unternehmen
// ---------------------------------------------------------------------------

export type VollmachtUmfang = "antraege" | "termine" | "post" | "zahlungen";

/**
 * Vollmacht zwischen zwei Konten – oder Mitgliedschaft in einem Unternehmenskonto.
 * vonKontoId = wer vertreten wird (Person oder Organisation), anKontoId = wer handelt.
 */
export interface VollmachtRecord extends StoredRecord {
  art: "vollmacht" | "organisation";
  vonKontoId: string;
  anKontoId?: string;
  rolle?: "inhaber" | "mitarbeiter";
  umfang: VollmachtUmfang[];
  /** Ablauf (ISO-Datum), sonst unbefristet bis zum Widerruf */
  bis?: string;
  status: "offen" | "aktiv" | "widerrufen";
  /** Einladung: Hash des Codes aus dem Link */
  einladungHash?: string;
  /** Verschlüsselt: { vonName, anName, anEmail } */
  inhalt: Verschluesselt;
}

/** Was eine bevollmächtigte Person im Namen einer anderen getan hat – sichtbar für die vertretene Person. */
export interface VertretungsLogRecord extends StoredRecord {
  vollmachtId: string;
  vonKontoId: string;
  anKontoId: string;
  aktion: string;
  details?: string;
}
