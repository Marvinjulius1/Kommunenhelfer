/** Bürgerkonto – gemeinsame Typen für Server und Browser. */

/**
 * Vertrauensniveau nach eIDAS:
 *  - basis: E-Mail + Passwort (Selbstauskunft)
 *  - hoch:  Online-Ausweis / BundID (Identität geprüft)
 */
export type Vertrauensniveau = "basis" | "hoch";

/** Stammdaten des Bürgers – werden verschlüsselt gespeichert und füllen Formulare vor. */
export interface Profil {
  vorname: string;
  nachname: string;
  geburtsdatum?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  email: string;
  telefon?: string;
  kontoinhaber?: string;
  iban?: string;
  /** Gültigkeit des Personalausweises – für die Erinnerung vor Ablauf */
  ausweisGueltigBis?: string;
  /** Antragsnummer eines beantragten Ausweises – Benachrichtigung, wenn abholbereit */
  ausweisAntragsnummer?: string;
  reisepassGueltigBis?: string;
  /**
   * Mein Haushalt – freiwillig, nur für persönliche Hinweise
   * („Ihr Kind wird 3 – Kita-Platz schon angemeldet?“). Verschlüsselt wie das ganze Profil.
   */
  kinder?: { vorname: string; geburtsdatum: string }[];
  hund?: boolean;
  grundbesitz?: boolean;
}

export interface Einstellungen {
  emailBenachrichtigung: boolean;
  pushBenachrichtigung: boolean;
  /** Abfallbezirk für Kalender und Erinnerungen */
  abfallBezirk?: string;
  /** Ortsteil für Meldungen (Straßensperrungen, Warnungen) */
  ortsteil?: string;
  /** Erinnerung am Vorabend der Abfuhr */
  abfallErinnerung: boolean;
}

/** Was der Browser über das angemeldete Konto erfährt (Datensparsamkeit: keine IBAN). */
export interface KontoSicht {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  geburtsdatum?: string;
  vertrauensniveau: Vertrauensniveau;
  emailBestaetigt: boolean;
  /** Kinder aus „Mein Haushalt“ – für Anträge im Namen eines Kindes */
  kinder?: { vorname: string; geburtsdatum: string }[];
  /** Aktive Vertretung: Die Person handelt gerade für jemand anderen */
  handeltFuer?: { name: string; art: "vollmacht" | "organisation"; umfang: string[] };
}

/** Felder, die aus dem Profil in Formulare übernommen werden (Feld-ID → Profil-Feld). */
export const VORBELEGUNG: Record<string, keyof Profil> = {
  vorname: "vorname",
  nachname: "nachname",
  geburtsdatum: "geburtsdatum",
  strasse: "strasse",
  plz: "plz",
  ort: "ort",
  email: "email",
  telefon: "telefon",
  kontoinhaber: "kontoinhaber",
  iban: "iban",
};
