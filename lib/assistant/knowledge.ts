/**
 * Wissensbasis pro Gemeinde.
 *
 * Quellen:
 *  - tenants/<slug>/wissen/*.md  (jede "## Überschrift" ist ein Abschnitt)
 *  - FAQ aus der Gemeinde-Konfiguration
 *
 * Suche: BM25 über Abschnitte. Keine Vektordatenbank nötig, keine Daten
 * verlassen den Server. Für sehr große Wissensbasen kann diese Datei
 * durch eine Vektorsuche ersetzt werden (gleiche Schnittstelle).
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GemeindeConfig } from "@/config/types";
import { tx } from "@/lib/i18n";
import { tokens } from "./text";

export interface Abschnitt {
  id: string;
  titel: string;
  text: string;
  quelle: string;
  tokens: string[];
}

export interface Treffer {
  abschnitt: Abschnitt;
  score: number;
  abdeckung: number;
}

const cache = new Map<string, Promise<Abschnitt[]>>();

function parseMarkdown(datei: string, inhalt: string): Abschnitt[] {
  let quelle = datei;
  let body = inhalt;
  const fm = inhalt.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = inhalt.slice(fm[0].length);
    const q = fm[1].match(/^quelle:\s*(.+)$/m);
    const t = fm[1].match(/^titel:\s*(.+)$/m);
    quelle = q?.[1].trim() ?? t?.[1].trim() ?? datei;
  }
  const teile = body.split(/^##\s+/m).slice(1);
  return teile.map((teil, i) => {
    const [kopf, ...rest] = teil.split("\n");
    const text = rest.join("\n").trim();
    const titel = kopf.trim();
    return { id: `${datei}#${i}`, titel, text, quelle, tokens: tokens(`${titel} ${titel} ${text}`) };
  });
}

async function lade(tenant: GemeindeConfig): Promise<Abschnitt[]> {
  const dir = path.join(process.cwd(), "tenants", tenant.slug, "wissen");
  const abschnitte: Abschnitt[] = [];
  try {
    for (const datei of (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort()) {
      abschnitte.push(...parseMarkdown(datei, await fs.readFile(path.join(dir, datei), "utf8")));
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  tenant.faq.forEach((f, i) => {
    const titel = tx(f.frage, "de");
    const text = tx(f.antwort, "de");
    abschnitte.push({ id: `faq#${i}`, titel, text, quelle: "Häufige Fragen", tokens: tokens(`${titel} ${text}`) });
  });
  return abschnitte;
}

export function wissensbasis(tenant: GemeindeConfig): Promise<Abschnitt[]> {
  // In der Entwicklung immer neu laden, damit Änderungen sofort wirken.
  if (process.env.NODE_ENV !== "production") return lade(tenant);
  if (!cache.has(tenant.slug)) cache.set(tenant.slug, lade(tenant));
  return cache.get(tenant.slug)!;
}

/**
 * Synonyme: Ein Suchbegriff gilt als gefunden, wenn eine seiner Varianten vorkommt.
 * (Bereits gestemmte Formen, siehe text.ts)
 */
const SYNONYME: string[][] = [
  ["hoch", "hoeh", "betraegt", "kost", "kostet", "gebuehr", "preis", "teuer"],
  ["zahl", "bezahl", "zahlung", "kart"],
  ["park", "parkplatz", "parkplaetz"],
  ["offen", "geoeffnet", "oeffnungszeit"],
  ["verlor", "verlust", "ersatz"],
  ["muell", "abfall"],
  ["blindenhund", "blindenfuehrhund", "fuehrhund", "assistenzhund"],
  ["hundemark", "steuermark", "hundesteuermark", "mark"],
];

/** Allgemeine Verben, die über das Thema einer Frage nichts aussagen. */
const ALLGEMEIN = new Set(["beantrag", "anmeld", "erledig", "bekomm", "erhalt", "frag", "wiss", "find", "brauch", "lass", "mach", "darf", "entsorg", "abgeb", "wegwerf"]);

function varianten(t: string): string[] {
  return SYNONYME.find((g) => g.includes(t)) ?? [t];
}

/** Gewicht, mit dem ein Suchbegriff in einem Dokument-Token vorkommt (auch als Wortteil). */
function passt(q: string, d: string): number {
  if (d === q) return 1;
  if (q.length >= 4 && (d.endsWith(q) || d.startsWith(q))) return 0.6;
  return 0;
}

/**
 * BM25-Suche mit Synonymen und Komposita-Erkennung.
 * `abdeckung` = Anteil der inhaltlichen Suchbegriffe, die im Abschnitt vorkommen.
 */
export async function suche(tenant: GemeindeConfig, anfrage: string, k = 4): Promise<Treffer[]> {
  const docs = await wissensbasis(tenant);
  const q = [...new Set(tokens(anfrage))];
  if (!q.length || !docs.length) return [];
  const inhaltlich = q.filter((t) => !ALLGEMEIN.has(t));

  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.tokens.length, 0) / N;
  const k1 = 1.4, b = 0.75;

  // Häufigkeit eines Begriffs (inkl. Varianten) in einem Dokument
  const tf = (t: string, d: Abschnitt) => {
    const v = varianten(t);
    return d.tokens.reduce((s, x) => s + Math.max(...v.map((y) => passt(y, x))), 0);
  };
  const df = new Map(q.map((t) => [t, docs.filter((d) => tf(t, d) > 0).length]));

  return docs
    .map((d) => {
      let score = 0;
      let gefunden = 0;
      for (const t of q) {
        const f = tf(t, d);
        if (!f) continue;
        if (!ALLGEMEIN.has(t)) gefunden++;
        const idf = Math.log(1 + (N - df.get(t)! + 0.5) / (df.get(t)! + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.tokens.length) / avgdl)));
      }
      const abdeckung = inhaltlich.length ? gefunden / inhaltlich.length : 0;
      return { abschnitt: d, score: score * (0.5 + abdeckung), abdeckung };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
