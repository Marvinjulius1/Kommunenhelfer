/**
 * Leichte PDF-Analyse ohne externe Bibliothek:
 *  - Seitenzahl
 *  - aktive Inhalte (JavaScript, Launch-Aktionen, eingebettete Dateien) → werden abgelehnt
 *  - Text für die Erkennung der Dokumentart (nur bei Text-PDFs, best effort)
 *
 * Der Text wird NIE als Anweisung verwendet, sondern nur nach Stichworten durchsucht.
 */
import "server-only";
import { inflateSync } from "node:zlib";

const MAX_STREAMS = 400;
const MAX_INFLATE = 8 * 1024 * 1024;

export interface PdfAnalyse {
  seiten: number;
  aktiverInhalt: boolean;
  text: string;
}

function decodeString(s: string): string {
  return s
    .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: "", f: "", "(": "(", ")": ")", "\\": "\\" })[c as string] ?? c)
    .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

export function analysierePdf(buf: Buffer): PdfAnalyse {
  const roh = buf.toString("latin1");
  const teile: string[] = [roh];
  let inflated = 0;

  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(roh)) && n++ < MAX_STREAMS && inflated < MAX_INFLATE) {
    const start = m.index + m[0].length;
    const ende = roh.indexOf("endstream", start);
    if (ende < 0) break;
    try {
      const out = inflateSync(buf.subarray(start, ende), { maxOutputLength: MAX_INFLATE - inflated });
      inflated += out.length;
      teile.push(out.toString("latin1"));
    } catch {
      /* nicht komprimiert oder anderes Verfahren – ignorieren */
    }
    re.lastIndex = ende;
  }

  const alles = teile.join("\n");
  const aktiverInhalt = /\/(JavaScript|JS)\s*[<(\[/]|\/Launch\b|\/EmbeddedFile\b|\/RichMedia\b/.test(alles);
  const seiten = Math.max(1, (alles.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length);

  let text = "";
  for (const t of teile.slice(1)) {
    for (const s of t.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")|\[((?:\\.|[^\]])*)\]\s*TJ/g)) {
      if (s[1] !== undefined) text += decodeString(s[1]);
      else if (s[2]) text += [...s[2].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => decodeString(x[1])).join("");
      text += " ";
      if (text.length > 20_000) break;
    }
  }
  return { seiten, aktiverInhalt, text: text.replace(/[^\p{L}\p{N}\s.,:/-]/gu, " ").replace(/\s+/g, " ").slice(0, 20_000) };
}
