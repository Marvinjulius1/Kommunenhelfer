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
  /** Ergebnis der Weiterleitung an das Amt */
  weiterleitung?: { typ: string; ok: boolean; am: string };
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
    | "meldung_entfernt";
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
}

/** Merker, dass eine geplante Aufgabe (z. B. Abfall-Erinnerung für einen Tag) erledigt ist. */
export interface CronLaufRecord extends StoredRecord {
  aufgabe: string;
  ergebnis: number;
}
