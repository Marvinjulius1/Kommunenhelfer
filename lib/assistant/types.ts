/**
 * Datentypen des Assistenten (gemeinsam für Server und Browser).
 */
import type { Sprache } from "@/config/types";

export type Aktion =
  | { typ: "antrag"; leistungId: string; label: string; hinweis?: string }
  | { typ: "termin"; leistungId?: string; label: string }
  | { typ: "kontakt"; label: string }
  | { typ: "link"; url: string; label: string };

export interface Antwort {
  /** Antworttext in einfachem Markdown (Absätze, Listen, **fett**). */
  text: string;
  /**
   * Bezug auf eine Leistung. Der Browser zeigt dann Unterlagen, Gebühren
   * und Ablauf DIREKT aus der Konfiguration an – diese Fakten werden nie
   * vom Sprachmodell formuliert.
   */
  leistungId?: string;
  /** Rückfrage-Optionen (Auswahl-Chips). */
  optionen?: { label: string; leistungId: string }[];
  aktionen: Aktion[];
  /** Quellenangaben aus der Wissensbasis. */
  quellen: string[];
  /** false = der Assistent hat keine gesicherte Information gefunden. */
  sicher: boolean;
}

export interface Nachricht {
  rolle: "buerger" | "assistent";
  text: string;
}

export interface AssistentAnfrage {
  nachrichten: Nachricht[];
  /** Direkte Auswahl einer Leistung (Schnellaktion oder Rückfrage-Option). */
  leistungId?: string;
  /** Leistung, über die zuletzt gesprochen wurde (für Folgefragen wie "Was kostet das?"). */
  kontextLeistungId?: string;
  lang: Sprache;
}
