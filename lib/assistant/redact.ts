/**
 * Pseudonymisierung vor der Übermittlung an ein externes Sprachmodell.
 * Entfernt offensichtliche personenbezogene Daten (Datensparsamkeit, Art. 5 DSGVO).
 * Der lokale Provider erhält die Daten nie außerhalb des Servers.
 */
export function redact(text: string): string {
  return text
    .replace(/[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?/gi, "[IBAN]")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[E-MAIL]")
    .replace(/(?:\+49|0)[\d\s/()-]{6,}\d/g, "[TELEFON]")
    .replace(/\b\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\b/g, "[DATUM]")
    .replace(/\b\d{9,}\b/g, "[NUMMER]");
}
