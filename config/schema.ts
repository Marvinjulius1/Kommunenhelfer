/**
 * Laufzeit-Validierung der Gemeinde-Konfiguration.
 *
 * Wird beim Laden des Mandanten-Registers (tenants/index.ts) ausgeführt.
 * Fehlt ein Pflichtfeld oder stimmt ein Verweis nicht, bricht der Build
 * (und der Start des Servers) mit einer verständlichen Meldung ab.
 *
 * Das Schema ist mit dem Typ `GemeindeConfig` gekoppelt: Weicht es ab,
 * meldet TypeScript einen Fehler.
 */
import { z } from "zod";
import type { GemeindeConfig } from "./types";
import { contrast } from "@/lib/color";
import { STANDARD_DOKUMENTARTEN } from "@/lib/uploads/dokumentarten";

const sprache = z.enum(["de", "en"]);
const ltext = z.union([z.string(), z.object({ de: z.string(), en: z.string().optional() })]);
const zeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Zeit im Format HH:MM");
const wochenplan = z.partialRecord(z.enum(["mo", "di", "mi", "do", "fr", "sa", "so"]), z.array(z.tuple([zeit, zeit])));
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Farbe als #RRGGBB");
const id = z.string().regex(/^[a-z0-9-]+$/, "nur Kleinbuchstaben, Ziffern und Bindestrich");

const feld = z.object({
  id: z.string().min(1),
  typ: z.enum(["text", "textarea", "email", "tel", "date", "number", "select", "radio", "checkbox", "iban", "plz"]),
  label: ltext,
  hinweis: ltext.optional(),
  pflicht: z.boolean().optional(),
  optionen: z.array(z.object({ wert: z.string(), label: ltext, hinweis: ltext.optional() })).optional(),
  autocomplete: z.string().optional(),
  muster: z.string().optional(),
  musterFehler: ltext.optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  maxLaenge: z.number().int().positive().optional(),
  standard: z.string().optional(),
  nurWenn: z.object({ feld: z.string(), gleich: z.union([z.string(), z.array(z.string())]) }).optional(),
  sensibel: z.boolean().optional(),
  halb: z.boolean().optional(),
});

const leistung = z.object({
  id,
  aktiv: z.boolean(),
  titel: ltext,
  kurz: ltext,
  beschreibung: ltext.optional(),
  stichworte: z.array(z.string()),
  unterlagen: z.array(ltext),
  gebuehren: z.array(z.object({ bezeichnung: ltext, betrag: z.union([z.number(), z.null(), z.string()]), hinweis: ltext.optional() })),
  ablauf: z.array(ltext),
  fristen: z.array(ltext).optional(),
  amtId: z.string().optional(),
  online: z.boolean(),
  termin: z.boolean(),
  dauer: ltext.optional(),
  formular: z
    .object({
      schritte: z.array(z.object({ id: z.string(), titel: ltext, beschreibung: ltext.optional(), felder: z.array(feld) })).min(1),
      bestaetigungen: z.array(z.object({ id: z.string(), label: ltext })).optional(),
      aufbewahrungTage: z.number().int().positive(),
    })
    .optional(),
  dokumente: z.array(z.object({ art: z.string(), pflicht: z.boolean(), hinweis: ltext.optional() })).optional(),
  aufbewahrungTage: z.number().int().positive().optional(),
  leistungsschluessel: z.string().optional(),
  rechtsgrundlage: ltext.optional(),
  externerLink: z.object({ label: ltext, url: z.string().url() }).optional(),
});

const amt = z.object({
  id,
  name: ltext,
  ort: ltext,
  zustaendigkeiten: z.array(z.string()).optional(),
  weiterleitung: z
    .discriminatedUnion("typ", [
      z.object({ typ: z.literal("backoffice") }),
      z.object({ typ: z.literal("email"), adresse: z.string().email() }),
      z.object({ typ: z.literal("webhook"), url: z.string().url(), secretEnv: z.string().regex(/^[A-Z0-9_]+$/) }),
    ])
    .optional(),
  bearbeitungshinweis: ltext.optional(),
  termine: z
    .object({
      zeiten: wochenplan,
      slotMinuten: z.number().int().min(5).max(240),
      parallel: z.number().int().min(1),
      vorlaufTage: z.number().int().min(0),
      buchbarTage: z.number().int().min(1).max(365),
    })
    .optional(),
});

export const gemeindeSchema: z.ZodType<GemeindeConfig> = z.object({
  slug: id,
  name: z.string().min(1),
  art: z.string().min(1),
  wappen: z.string().startsWith("/"),
  wappenAlt: z.string().min(1),
  akzentfarbe: hex,
  akzentfarbeDunkel: hex.optional(),
  sprachen: z.array(sprache).min(1),
  standardSprache: sprache,
  texte: z.object({ untertitel: ltext.optional(), platzhalter: ltext, begruessung: ltext }),
  kontakt: z.object({
    bezeichnung: ltext,
    strasse: z.string(),
    plz: z.string().regex(/^\d{5}$/),
    ort: z.string(),
    telefon: z.string().optional(),
    email: z.string().email().optional(),
    hinweis: ltext.optional(),
  }),
  oeffnungszeiten: wochenplan,
  oeffnungszeitenHinweis: ltext.optional(),
  schliesstage: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  rechtliches: z.object({
    impressumUrl: z.string().url(),
    datenschutzUrl: z.string().url(),
    verantwortlich: z.string().min(1),
    datenschutzbeauftragter: z.string().min(1),
    barrierefreiheitKontakt: z.string().min(1),
  }),
  aemter: z.array(amt).min(1),
  uploads: z.object({
    aktiv: z.boolean(),
    maxDateiMB: z.number().positive().max(50),
    maxGesamtMB: z.number().positive().max(200),
    maxDateien: z.number().int().min(1).max(30),
    aufbewahrungTage: z.number().int().positive(),
    standardAmtId: z.string(),
  }),
  dokumentarten: z.array(z.object({ id, label: ltext, stichworte: z.array(z.string()) })).optional(),
  leistungen: z.array(leistung),
  rueckfragen: z.array(z.object({ id: z.string(), stichworte: z.array(z.string()), frage: ltext, optionen: z.array(z.object({ label: ltext, leistungId: z.string() })) })),
  faq: z.array(z.object({ frage: ltext, antwort: ltext })),
  email: z.object({ absenderName: z.string().min(1), absenderAdresse: z.string().email() }),
});

/**
 * Prüft eine Konfiguration vollständig: Schema + Querverweise + Kontraste.
 * Gibt eine Liste verständlicher Fehlermeldungen zurück (leer = alles gut).
 */
export function pruefeGemeinde(roh: unknown): string[] {
  const r = gemeindeSchema.safeParse(roh);
  if (!r.success) {
    return r.error.issues.map((i) => `${i.path.join(".") || "(Wurzel)"}: ${i.message}`);
  }
  const t = r.data;
  const fehler: string[] = [];
  const aemter = new Set(t.aemter.map((a) => a.id));
  const arten = new Set([...STANDARD_DOKUMENTARTEN.map((d) => d.id), ...(t.dokumentarten ?? []).map((d) => d.id)]);

  if (Math.min(contrast(t.akzentfarbe, "#ffffff"), contrast(t.akzentfarbe, "#f5f7f9")) < 4.5)
    fehler.push(`akzentfarbe: ${t.akzentfarbe} hat zu wenig Kontrast auf hellem Hintergrund (mind. 4.5:1)`);
  const dunkel = t.akzentfarbeDunkel ?? t.akzentfarbe;
  if (contrast(dunkel, "#07090b") < 4.5) fehler.push(`akzentfarbeDunkel: ${dunkel} hat zu wenig Kontrast auf dunklem Hintergrund (mind. 4.5:1)`);
  if (!t.sprachen.includes(t.standardSprache)) fehler.push(`standardSprache: "${t.standardSprache}" fehlt in sprachen`);
  if (!aemter.has(t.uploads.standardAmtId)) fehler.push(`uploads.standardAmtId: Amt "${t.uploads.standardAmtId}" existiert nicht`);
  if (new Set(t.aemter.map((a) => a.id)).size !== t.aemter.length) fehler.push(`aemter: doppelte IDs`);
  for (const a of t.aemter)
    if (a.weiterleitung?.typ === "webhook" && !/^https:\/\//.test(a.weiterleitung.url) && !/^http:\/\/localhost/.test(a.weiterleitung.url))
      fehler.push(`aemter[${a.id}].weiterleitung.url: nur https:// erlaubt`);

  const ids = new Set<string>();
  for (const l of t.leistungen) {
    if (ids.has(l.id)) fehler.push(`leistungen: ID "${l.id}" doppelt`);
    ids.add(l.id);
    if (!l.aktiv) continue;
    const pfad = `leistungen[${l.id}]`;
    if (l.amtId && !aemter.has(l.amtId)) fehler.push(`${pfad}.amtId: Amt "${l.amtId}" existiert nicht`);
    if (l.termin && !(l.amtId && t.aemter.find((a) => a.id === l.amtId)?.termine))
      fehler.push(`${pfad}: termin=true, aber das Amt hat keine "termine"`);
    for (const d of l.dokumente ?? []) if (!arten.has(d.art)) fehler.push(`${pfad}.dokumente: unbekannte Dokumentart "${d.art}"`);
    if (l.formular) {
      const felder = l.formular.schritte.flatMap((s) => s.felder);
      const fids = new Set<string>();
      for (const f of felder) {
        if (fids.has(f.id)) fehler.push(`${pfad}.formular: Feld-ID "${f.id}" doppelt`);
        fids.add(f.id);
        if ((f.typ === "radio" || f.typ === "select") && !f.optionen?.length) fehler.push(`${pfad}.${f.id}: Auswahlfeld ohne optionen`);
        if (f.muster) {
          try {
            new RegExp(f.muster);
          } catch {
            fehler.push(`${pfad}.${f.id}: muster ist kein gültiger regulärer Ausdruck`);
          }
        }
      }
      if (!fids.has("email")) fehler.push(`${pfad}.formular: Feld "email" fehlt – ohne E-Mail keine Eingangsbestätigung`);
      for (const f of felder) if (f.nurWenn && !fids.has(f.nurWenn.feld)) fehler.push(`${pfad}.${f.id}.nurWenn: unbekanntes Feld "${f.nurWenn.feld}"`);
    }
  }
  for (const r of t.rueckfragen) for (const o of r.optionen) if (!ids.has(o.leistungId)) fehler.push(`rueckfragen[${r.id}]: unbekannte Leistung "${o.leistungId}"`);
  return fehler;
}
