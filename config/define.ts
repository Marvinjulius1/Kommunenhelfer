import type { GemeindeConfig } from "./types";

/**
 * Hilfsfunktion für Gemeinde-Konfigurationen.
 * Sie macht nichts zur Laufzeit, sorgt aber für Autovervollständigung
 * und Typprüfung im Editor.
 */
export function defineGemeinde(config: GemeindeConfig): GemeindeConfig {
  return config;
}

export type * from "./types";
