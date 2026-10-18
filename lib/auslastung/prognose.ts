/**
 * Auslastungsprognose für Ämter mit Terminen bzw. Wartenummern.
 *
 * Modell (bewusst einfach und nachvollziehbar):
 *  erwartet = max(bereits gebucht, Ø Termine am gleichen Wochentag) + Ø Wartenummern am gleichen Wochentag
 *  Ø gewichtet: jüngere Wochen zählen mehr (8 Wochen, Gewicht 8…1).
 *  Personalbedarf = erwartete Kontakte × Minuten je Kontakt / Öffnungsminuten des Tages.
 * Gemeinsam für Server und Tests.
 */
import type { Amt, GemeindeConfig } from "@/config/types";
import { addTage, istGeschlossen, wochentag } from "@/lib/booking/slots";

export interface TagWert {
  datum: string;
  termine: number;
  wartenummern: number;
}

export interface TagPrognose {
  datum: string;
  geschlossen: boolean;
  gebucht: number;
  erwartet: number;
  /** Termin-Plätze laut Konfiguration */
  plaetze: number;
  /** erwartet / Kapazität (0–n) */
  auslastung: number;
  vorhanden: number;
  noetig: number;
  fehlen: number;
}

const minuten = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Öffnungsminuten (Terminfenster) und Plätze eines Tages. */
export function kapazitaet(tenant: GemeindeConfig, amt: Amt, datum: string) {
  const a = amt.termine;
  if (!a || istGeschlossen(tenant, datum)) return { minuten: 0, plaetze: 0 };
  const fenster = a.zeiten[wochentag(datum)] ?? [];
  const m = fenster.reduce((s, [von, bis]) => s + Math.max(0, minuten(bis) - minuten(von)), 0);
  const plaetze = fenster.reduce((s, [von, bis]) => s + Math.floor(Math.max(0, minuten(bis) - minuten(von)) / a.slotMinuten), 0) * a.parallel;
  return { minuten: m, plaetze };
}

/** Gewichteter Durchschnitt der letzten 8 gleichen Wochentage (fehlende Tage zählen nicht). */
export function wochentagsMittel(historie: TagWert[], datum: string, feld: "termine" | "wartenummern"): number | undefined {
  const map = new Map(historie.map((h) => [h.datum, h]));
  let summe = 0;
  let gewichte = 0;
  for (let w = 1; w <= 8; w++) {
    const d = addTage(datum, -7 * w);
    const h = map.get(d);
    if (!h) continue;
    const g = 9 - w;
    summe += h[feld] * g;
    gewichte += g;
  }
  return gewichte ? summe / gewichte : undefined;
}

export function prognose(tenant: GemeindeConfig, amt: Amt, historie: TagWert[], gebucht: Map<string, number>, heute: string, tage = 14): TagPrognose[] {
  const slot = amt.termine?.slotMinuten ?? 15;
  const vorhanden = amt.termine?.parallel ?? 1;
  return Array.from({ length: tage }, (_, i) => addTage(heute, i + 1)).map((datum) => {
    const k = kapazitaet(tenant, amt, datum);
    const g = gebucht.get(datum) ?? 0;
    if (!k.minuten) return { datum, geschlossen: true, gebucht: g, erwartet: 0, plaetze: 0, auslastung: 0, vorhanden, noetig: 0, fehlen: 0 };
    const termine = Math.max(g, Math.round(wochentagsMittel(historie, datum, "termine") ?? 0));
    const erwartet = termine + Math.round(wochentagsMittel(historie, datum, "wartenummern") ?? 0);
    const noetig = Math.ceil((erwartet * slot) / k.minuten - 0.05);
    return { datum, geschlossen: false, gebucht: g, erwartet, plaetze: k.plaetze, auslastung: k.plaetze ? erwartet / k.plaetze : 0, vorhanden, noetig, fehlen: Math.max(0, noetig - vorhanden) };
  });
}
