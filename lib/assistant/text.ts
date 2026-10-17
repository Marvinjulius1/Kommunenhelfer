/**
 * Einfache deutsche Textverarbeitung für die Suche:
 * Normalisierung, Stoppwörter, sehr leichtes Stemming.
 * Bewusst ohne externe Abhängigkeiten und ohne Datenabfluss.
 */

const STOPP = new Set(
  (
    "der die das den dem des ein eine einen einem einer eines und oder aber ich du er sie es wir ihr mein meine meinen " +
    "meinem meiner mich mir sich ist sind bin bist war waren wird werden wurde hat habe haben hatte kann koennen " +
    "moechte moechten will wollen muss muessen soll sollen zu zum zur im in an am auf aus bei mit nach von vor fuer " +
    "ueber unter um als wie was wo wann wer warum welche welcher welches wieviel wie viel nicht kein keine noch " +
    "schon auch nur so da dann wenn dass ob bitte gern gerne hallo danke ja nein mal man etwas einfach sehr " +
    "brauche brauchen gibt geben geht gehen machen mache the a an i my to for how what is do can"
  ).split(" "),
);

export function normalisiere(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Buchstaben aller Schriften behalten (Türkisch, Kyrillisch, Arabisch), Satzzeichen entfernen
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kürzt gängige Flexionsendungen, damit "Hunde", "Hundes", "Hund" gleich behandelt werden. */
export function stamm(w: string): string {
  // Zwei Durchgänge: "Steuern" → "Steuer" → "Steu" (wie "Hundesteuer" → "Hundesteu")
  for (let i = 0; i < 2; i++) {
    const suf = ["ungen", "ung", "en", "er", "es", "e", "n", "s"].find((s) => w.endsWith(s) && w.length - s.length >= 4);
    if (!suf) break;
    w = w.slice(0, -suf.length);
  }
  return w;
}

export function tokens(s: string, mitStopp = false): string[] {
  return normalisiere(s)
    .split(" ")
    .filter((w) => w.length > 1 && (mitStopp || !STOPP.has(w)))
    .map(stamm);
}

/** Prüft, ob alle Wörter eines Stichworts (auch mehrteilig) in der Anfrage vorkommen. */
export function enthaeltPhrase(anfrageTokens: Set<string>, anfrageNorm: string, phrase: string): boolean {
  const pt = tokens(phrase, true);
  if (pt.length === 0) return false;
  if (pt.length === 1) {
    // Einwort-Stichwort: als Token ODER als Wortbestandteil (Komposita wie "Hundesteuermarke")
    const p = pt[0];
    return anfrageTokens.has(p) || (p.length >= 5 && anfrageNorm.includes(normalisiere(phrase)));
  }
  return pt.every((t) => anfrageTokens.has(t));
}

export function istFrage(s: string): boolean {
  const n = normalisiere(s);
  return /\?\s*$/.test(s.trim()) || /^(wie|was|wann|wo|wer|warum|wieso|weshalb|welche|welcher|welches|wieviel|muss|darf|kann|gibt|brauche|how|what|when|where|who|why|which|do|does|can|is)\b/.test(n) || /\b(kostet|kosten|gebuehr)/.test(n);
}
