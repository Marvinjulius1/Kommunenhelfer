/**
 * Abfallkalender: Abfuhrtermine aus Startdatum und Rhythmus je Bezirk.
 * Fällt eine Abfuhr auf einen Feiertag, verschiebt sie sich (wenn konfiguriert)
 * auf den nächsten Werktag – so wie es die meisten Entsorger handhaben.
 * Gemeinsam für Server und Browser.
 */
import type { AbfallConfig, GemeindeConfig } from "@/config/types";
import { istFeiertag, plusTage } from "@/lib/feiertage";

export interface Abfuhr {
  datum: string;
  art: string;
  /** Ursprünglicher Termin, falls wegen eines Feiertags verschoben */
  verschobenVon?: string;
  feiertag?: string;
}

type Bezirk = AbfallConfig["bezirke"][number];

function naechsterWerktag(d: string): string {
  let x = d;
  for (let i = 0; i < 7; i++) {
    const wt = new Date(x + "T12:00:00Z").getUTCDay();
    if (wt !== 0 && !istFeiertag(x)) return x;
    x = plusTage(x, 1);
  }
  return x;
}

/** Alle Abfuhren eines Bezirks im Zeitraum [von, bis] (inklusive), sortiert. */
export function abfuhren(cfg: AbfallConfig, bezirk: Bezirk, von: string, bis: string): Abfuhr[] {
  const liste: Abfuhr[] = [];
  const vonMs = Date.parse(von + "T00:00:00Z");
  for (const [art, t] of Object.entries(bezirk.termine)) {
    const startMs = Date.parse(t.start + "T00:00:00Z");
    const schritt = t.intervallTage * 86_400_000;
    // ersten Termin ≥ (von − 7 Tage) bestimmen, damit Verschiebungen über "von" erfasst werden
    const ab = Math.max(0, Math.ceil((vonMs - 7 * 86_400_000 - startMs) / schritt));
    for (let n = ab; ; n++) {
      const regulaer = new Date(startMs + n * schritt).toISOString().slice(0, 10);
      if (regulaer > bis) break;
      const feiertag = cfg.feiertagVerschiebung ? istFeiertag(regulaer) : undefined;
      const datum = feiertag ? naechsterWerktag(plusTage(regulaer, 1)) : regulaer;
      if (datum < von || datum > bis) continue;
      liste.push(feiertag ? { datum, art, verschobenVon: regulaer, feiertag } : { datum, art });
    }
  }
  return liste.sort((a, b) => a.datum.localeCompare(b.datum) || a.art.localeCompare(b.art));
}

export function findeBezirk(tenant: GemeindeConfig, id: string | undefined): Bezirk | undefined {
  return id ? tenant.abfall?.bezirke.find((b) => b.id === id) : undefined;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/str\.?(\s|$)/g, "strasse$1")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Straßensuche: liefert passende Straßen mit Bezirk (max. 8). */
export function sucheStrasse(cfg: AbfallConfig, eingabe: string): { strasse: string; bezirkId: string }[] {
  const q = norm(eingabe.replace(/\d+\s*[a-z]?$/i, ""));
  if (q.length < 2) return [];
  const treffer: { strasse: string; bezirkId: string; rang: number }[] = [];
  for (const b of cfg.bezirke)
    for (const s of b.strassen) {
      const n = norm(s);
      if (n.startsWith(q)) treffer.push({ strasse: s, bezirkId: b.id, rang: 0 });
      else if (n.includes(q)) treffer.push({ strasse: s, bezirkId: b.id, rang: 1 });
    }
  return treffer
    .sort((a, b) => a.rang - b.rang || a.strasse.localeCompare(b.strasse, "de"))
    .slice(0, 8)
    .map(({ strasse, bezirkId }) => ({ strasse, bezirkId }));
}

/** Zeilen auf höchstens 75 Oktette falten (RFC 5545, 3.1), ohne UTF-8-Zeichen zu zerteilen. */
function falte(zeile: string): string {
  const enc = new TextEncoder();
  const teile: string[] = [];
  let akt = "";
  let laenge = 0;
  for (const z of zeile) {
    const b = enc.encode(z).length;
    if (laenge + b > (teile.length ? 74 : 75)) {
      teile.push(akt);
      akt = "";
      laenge = 0;
    }
    akt += z;
    laenge += b;
  }
  teile.push(akt);
  return teile.join("\r\n ");
}

/** iCalendar-Datei (RFC 5545) mit ganztägigen Terminen und Erinnerung am Vorabend. */
export function ics(tenant: GemeindeConfig, bezirk: Bezirk, liste: Abfuhr[], label: (art: string) => string): string {
  const stempel = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const esc = (s: string) => s.replace(/[\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${esc(tenant.name)}//Abfallkalender//DE`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Abfall ${tenant.name} – ${bezirk.name}`)}`,
  ];
  for (const a of liste) {
    const d = a.datum.replace(/-/g, "");
    const ende = plusTage(a.datum, 1).replace(/-/g, "");
    zeilen.push(
      "BEGIN:VEVENT",
      `UID:${tenant.slug}-${bezirk.id}-${a.art}-${d}@buergerportal`,
      `DTSTAMP:${stempel}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${ende}`,
      `SUMMARY:${esc(label(a.art))}`,
      ...(a.verschobenVon ? [`DESCRIPTION:${esc(`Verschoben wegen ${a.feiertag}`)}`] : []),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Morgen: ${label(a.art)}`)}`,
      "TRIGGER:-PT6H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  zeilen.push("END:VCALENDAR");
  return zeilen.map(falte).join("\r\n") + "\r\n";
}
