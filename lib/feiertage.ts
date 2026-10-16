/**
 * Bundesweite gesetzliche Feiertage (ohne landesspezifische Tage).
 * Daten als ISO-Datum "YYYY-MM-DD", gerechnet in Kalendertagen ohne Zeitzone.
 */

/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch). */
export function ostersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDatum(Date.UTC(jahr, monat - 1, tag));
}

export function isoDatum(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function plusTage(datum: string, tage: number): string {
  return isoDatum(Date.parse(datum + "T00:00:00Z") + tage * 86_400_000);
}

const cache = new Map<number, Map<string, string>>();

/** Feiertage eines Jahres: Datum → Name */
export function feiertage(jahr: number): Map<string, string> {
  const vorhanden = cache.get(jahr);
  if (vorhanden) return vorhanden;
  const ostern = ostersonntag(jahr);
  const f = new Map<string, string>([
    [`${jahr}-01-01`, "Neujahr"],
    [plusTage(ostern, -2), "Karfreitag"],
    [plusTage(ostern, 1), "Ostermontag"],
    [`${jahr}-05-01`, "Tag der Arbeit"],
    [plusTage(ostern, 39), "Christi Himmelfahrt"],
    [plusTage(ostern, 50), "Pfingstmontag"],
    [`${jahr}-10-03`, "Tag der Deutschen Einheit"],
    [`${jahr}-12-25`, "1. Weihnachtstag"],
    [`${jahr}-12-26`, "2. Weihnachtstag"],
  ]);
  cache.set(jahr, f);
  return f;
}

export function istFeiertag(datum: string): string | undefined {
  return feiertage(Number(datum.slice(0, 4))).get(datum);
}
