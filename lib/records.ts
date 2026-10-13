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
  quelle: "formular" | "upload";
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
  aktion: "anmeldung" | "anmeldung_fehlgeschlagen" | "vorgang_geoeffnet" | "dokument_geoeffnet" | "dokument_extern_abgerufen" | "status_geaendert" | "rueckfrage_gesendet";
  vorgangId?: string;
  dokumentId?: string;
  details?: string;
}
