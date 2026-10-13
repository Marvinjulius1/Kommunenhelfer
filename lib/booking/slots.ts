/**
 * Berechnung freier Termine.
 *
 * Alle Zeiten sind Ortszeit Europe/Berlin – unabhängig davon,
 * in welcher Zeitzone der Server läuft.
 */
import type { Amt, GemeindeConfig, Wochentag } from "@/config/types";

export const TZ = "Europe/Berlin";
const TAGE: Wochentag[] = ["so", "mo", "di", "mi", "do", "fr", "sa"];

export interface Slot {
  /** "YYYY-MM-DDTHH:MM" (Ortszeit) – eindeutige ID innerhalb eines Amts. */
  id: string;
  datum: string;
  zeit: string;
  frei: number;
}

/** Heutiges Datum in Berlin als "YYYY-MM-DD". */
export function heuteBerlin(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

function jetztMinutenBerlin(now = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(now)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

export function addTage(datum: string, n: number): string {
  const d = new Date(datum + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function wochentag(datum: string): Wochentag {
  return TAGE[new Date(datum + "T12:00:00Z").getUTCDay()];
}

/** Wandelt Berliner Ortszeit in einen echten Zeitpunkt (UTC) um. */
export function berlinZuDate(datum: string, zeit: string): Date {
  const naiv = new Date(`${datum}T${zeit}:00Z`);
  // Offset von Berlin zu diesem Zeitpunkt ermitteln (+1h Winter, +2h Sommer).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" }).formatToParts(naiv);
  const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = off.match(/GMT([+-]\d+)(?::(\d+))?/);
  const minuten = m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 60;
  return new Date(naiv.getTime() - minuten * 60_000);
}

function zuMinuten(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function zuZeit(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Ostersonntag (Gauß'sche Osterformel, Anonymer Gregorianischer Algorithmus). */
function ostersonntag(jahr: number): string {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/** Bundesweite gesetzliche Feiertage. Landesspezifische Tage über `schliesstage` ergänzen. */
export function bundesFeiertage(jahr: number): string[] {
  const o = ostersonntag(jahr);
  return [
    `${jahr}-01-01`,
    addTage(o, -2),
    addTage(o, 1),
    `${jahr}-05-01`,
    addTage(o, 39),
    addTage(o, 50),
    `${jahr}-10-03`,
    `${jahr}-12-25`,
    `${jahr}-12-26`,
  ];
}

export function istGeschlossen(tenant: GemeindeConfig, datum: string): boolean {
  const jahr = Number(datum.slice(0, 4));
  return tenant.schliesstage.includes(datum) || bundesFeiertage(jahr).includes(datum);
}

/**
 * Freie Slots eines Amts im Zeitraum.
 * @param belegt Anzahl bestehender Buchungen je Slot-ID
 */
export function berechneSlots(
  tenant: GemeindeConfig,
  amt: Amt,
  belegt: Map<string, number>,
  now = new Date(),
): Slot[] {
  const heute = heuteBerlin(now);
  const jetzt = jetztMinutenBerlin(now);
  const slots: Slot[] = [];

  for (let i = amt.vorlaufTage; i <= amt.buchbarTage; i++) {
    const datum = addTage(heute, i);
    if (istGeschlossen(tenant, datum)) continue;
    const fenster = amt.terminzeiten[wochentag(datum)] ?? [];
    for (const [von, bis] of fenster) {
      for (let t = zuMinuten(von); t + amt.slotMinuten <= zuMinuten(bis); t += amt.slotMinuten) {
        if (i === 0 && t <= jetzt + 30) continue; // heute: mind. 30 Minuten Vorlauf
        const zeit = zuZeit(t);
        const id = `${datum}T${zeit}`;
        const frei = amt.parallel - (belegt.get(id) ?? 0);
        if (frei > 0) slots.push({ id, datum, zeit, frei });
      }
    }
  }
  return slots;
}
