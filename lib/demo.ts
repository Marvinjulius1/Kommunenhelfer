/**
 * Demo-Modus: aktiviert alle Test-Anbieter auf einmal (für Vorführungen, z. B. auf Vercel).
 *  - Online-Ausweis (Simulation mit Testidentität)
 *  - Online-Bezahlung (Testzahlung, kein Geld fließt)
 *  - Backoffice-Zugang demo/demo
 *  - Virenscan aus (sofern VIRUS_SCAN nicht gesetzt ist)
 * In der Entwicklung immer aktiv. In Produktion nur mit DEMO_MODUS=1 – NIE mit echten Daten.
 */
export function demoModus(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODUS === "1";
}
