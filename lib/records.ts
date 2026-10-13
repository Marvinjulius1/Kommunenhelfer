/** Datensätze im Speicher. Personenbezogene Daten stehen nur verschlüsselt in `daten`. */
import type { StoredRecord } from "@/lib/storage/store";

export type AntragStatus = "eingegangen" | "in_bearbeitung" | "rueckfrage" | "abgeschlossen";

export interface AntragRecord extends StoredRecord {
  leistungId: string;
  leistungsschluessel?: string;
  status: AntragStatus;
  verlauf: { status: AntragStatus; am: string }[];
  tokenHash: string;
  /** AES-256-GCM verschlüsselt (lib/crypto.ts). */
  daten: string;
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
  daten: string;
}
