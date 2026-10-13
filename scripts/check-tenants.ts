/**
 * Prüft alle Gemeinde-Konfigurationen auf typische Fehler.
 *   npm run tenant:check
 *
 * - Akzentfarben erfüllen WCAG-AA-Kontrast (≥ 4.5:1)
 * - Wappen-Datei existiert
 * - Verweise (Amt, Rückfragen, Schnellaktionen, Formularbedingungen) sind gültig
 * - Wissensbasis-Ordner vorhanden
 */
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { tenants } from "../tenants";
import { contrast } from "../lib/color";

let fehler = 0;
let warnungen = 0;
const err = (slug: string, msg: string) => (fehler++, console.log(`  ✗ [${slug}] ${msg}`));
const warn = (slug: string, msg: string) => (warnungen++, console.log(`  ! [${slug}] ${msg}`));

for (const [key, t] of Object.entries(tenants)) {
  console.log(`\n${t.art} ${t.name} (${key})`);
  if (key !== t.slug) err(key, `Schlüssel im Register (${key}) ≠ slug (${t.slug})`);

  // Kontraste
  const hell = contrast(t.akzentfarbe, "#ffffff");
  const hellBg = contrast(t.akzentfarbe, "#f5f5f7");
  if (Math.min(hell, hellBg) < 4.5) err(t.slug, `Akzentfarbe ${t.akzentfarbe} hat zu wenig Kontrast zu Hell (${Math.min(hell, hellBg).toFixed(2)}:1, nötig 4.5:1)`);
  const dunkel = t.akzentfarbeDunkel ?? t.akzentfarbe;
  const dk = contrast(dunkel, "#000000");
  if (dk < 4.5) err(t.slug, `Akzentfarbe (dunkel) ${dunkel} hat zu wenig Kontrast zu Schwarz (${dk.toFixed(2)}:1)`);

  // Dateien
  if (!existsSync(path.join("public", t.wappen))) err(t.slug, `Wappen nicht gefunden: public${t.wappen}`);
  const wissen = path.join("tenants", t.slug, "wissen");
  if (!existsSync(wissen)) warn(t.slug, `Kein Wissensbasis-Ordner (${wissen})`);
  else if (!readdirSync(wissen).some((f) => f.endsWith(".md"))) warn(t.slug, `Wissensbasis ist leer`);

  // Verweise
  const aemter = new Set(t.aemter.map((a) => a.id));
  const aktive = new Set(t.leistungen.filter((l) => l.aktiv).map((l) => l.id));
  const ids = new Set<string>();
  for (const l of t.leistungen) {
    if (ids.has(l.id)) err(t.slug, `Leistung doppelt: ${l.id}`);
    ids.add(l.id);
    if (!/^[a-z0-9-]+$/.test(l.id)) err(t.slug, `Ungültige Leistungs-ID "${l.id}" (nur a-z, 0-9, -)`);
    if (!l.aktiv) continue;
    if (l.amtId && !aemter.has(l.amtId)) err(t.slug, `${l.id}: Amt "${l.amtId}" existiert nicht`);
    if (l.termin && !l.amtId) err(t.slug, `${l.id}: termin=true, aber kein amtId`);
    if (l.online && !l.formular && !l.externerLink) warn(t.slug, `${l.id}: online=true, aber kein Formular`);
    if (!l.stichworte.length) warn(t.slug, `${l.id}: keine Stichworte – der Assistent findet die Leistung schwer`);
    if (l.formular) {
      const felder = l.formular.schritte.flatMap((s) => s.felder);
      const fids = new Set<string>();
      for (const f of felder) {
        if (fids.has(f.id)) err(t.slug, `${l.id}: Feld-ID doppelt: ${f.id}`);
        fids.add(f.id);
        if ((f.typ === "radio" || f.typ === "select") && !f.optionen?.length) err(t.slug, `${l.id}.${f.id}: Auswahlfeld ohne Optionen`);
        if (f.muster) {
          try {
            new RegExp(f.muster);
          } catch {
            err(t.slug, `${l.id}.${f.id}: ungültiger regulärer Ausdruck`);
          }
        }
      }
      for (const f of felder) if (f.nurWenn && !fids.has(f.nurWenn.feld)) err(t.slug, `${l.id}.${f.id}: nurWenn verweist auf unbekanntes Feld "${f.nurWenn.feld}"`);
      if (!fids.has("email")) warn(t.slug, `${l.id}: Formular ohne Feld "email" – es wird keine Eingangsbestätigung versendet`);
    }
  }
  for (const r of t.rueckfragen)
    for (const o of r.optionen) if (!aktive.has(o.leistungId)) warn(t.slug, `Rückfrage "${r.id}": Leistung "${o.leistungId}" nicht aktiv`);
  for (const s of t.schnellaktionen) if (s.leistungId && !aktive.has(s.leistungId)) warn(t.slug, `Schnellaktion verweist auf inaktive Leistung "${s.leistungId}"`);
  if (t.schnellaktionen.length > 6) warn(t.slug, `Mehr als 6 Schnellaktionen – nur die ersten 6 werden angezeigt`);
  if (!t.sprachen.includes(t.standardSprache)) err(t.slug, `standardSprache ist nicht in sprachen enthalten`);
}

console.log(`\n${fehler} Fehler, ${warnungen} Warnungen.`);
process.exit(fehler ? 1 : 0);
