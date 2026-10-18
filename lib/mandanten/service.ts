/**
 * Mandanten ohne Code-Änderung: Der Betreiber legt neue Gemeinden (oder Demo-
 * Gemeinden für Vertriebstermine) im Backoffice an. Gespeichert wird eine
 * vollständige, geprüfte GemeindeConfig; die Konfigurationsdateien unter
 * tenants/ bleiben die Grundlage für den Dauerbetrieb.
 */
import "server-only";
import type { GemeindeConfig, Paket } from "@/config/types";
import { pruefeGemeinde } from "@/config/schema";
import { barrierefreiDunkel, barrierefreiHell } from "@/lib/color";
import type { StoredRecord } from "@/lib/storage/store";
import { inTagen, store } from "@/lib/storage/store";
import { tenants } from "@/tenants";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";

export interface MandantRecord extends StoredRecord {
  config: GemeindeConfig;
  demo: boolean;
  erstelltVon: string;
  /** Wappen als Data (SVG-Text oder Base64-PNG) */
  wappen: { typ: "image/svg+xml" | "image/png"; daten: string };
}

const g = globalThis as { __mandanten?: { zeit: number; liste: MandantRecord[] } };

export async function dynamischeMandanten(): Promise<MandantRecord[]> {
  if (g.__mandanten && Date.now() - g.__mandanten.zeit < 10_000) return g.__mandanten.liste;
  const liste = await store().list<MandantRecord>("mandanten");
  g.__mandanten = { zeit: Date.now(), liste };
  return liste;
}

export async function dynamischerMandant(slug: string | null | undefined) {
  if (!slug) return undefined;
  return (await dynamischeMandanten()).find((m) => m.id === slug);
}

/** Alle Gemeinden: Konfigurationsdateien und im Portal angelegte. */
export async function alleGemeinden(): Promise<{ config: GemeindeConfig; quelle: "datei" | "portal"; demo: boolean; erstelltAm?: string; loeschenAm?: string }[]> {
  return [
    ...Object.values(tenants).map((config) => ({ config, quelle: "datei" as const, demo: false })),
    ...(await dynamischeMandanten()).map((m) => ({ config: m.config, quelle: "portal" as const, demo: m.demo, erstelltAm: m.erstelltAm, loeschenAm: m.loeschenAm })),
  ];
}

export function slugAus(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** Schlichtes Wappen: Schild in der Gemeindefarbe mit Initiale – bis das echte Wappen da ist. */
export function erzeugeWappen(name: string, farbe: string): string {
  const initiale = esc((name.replace(/^(Stadt|Gemeinde|Markt|Landkreis)\s+/i, "").trim()[0] ?? "?").toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" role="img"><path d="M8 8h104v62c0 34-25 54-52 64C33 124 8 104 8 70Z" fill="${farbe}"/><path d="M16 16h88v54c0 28-20 45-44 54-24-9-44-26-44-54Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><text x="60" y="88" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" fill="#fff">${initiale}</text></svg>`;
}

/** Hochgeladene SVGs: nur einfache Grafiken – keine Skripte, Ereignisse, externen Verweise. */
export function svgSicher(svg: string) {
  return svg.length < 300_000 && /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg) && !/<script|<foreignObject|\son\w+\s*=|javascript:|href\s*=\s*(?!["']?#)|<!ENTITY|<iframe|<embed|<object/i.test(svg);
}

export interface NeueGemeinde {
  name: string;
  art: string;
  farbe: string;
  einwohner?: number;
  paket: Paket;
  demo: boolean;
  email: string;
  strasse: string;
  plz: string;
  ort?: string;
  wappen?: { typ: "image/svg+xml" | "image/png"; daten: string };
}

/**
 * Baut aus der Musterstadt eine neue Gemeinde. Demo: mit allen Beispieldaten
 * (Kitas, Veranstaltungen, Karte …) – sonst nur Leistungen und Ämter.
 */
export function baueGemeinde(d: NeueGemeinde, slug: string): GemeindeConfig {
  const hell = barrierefreiHell(d.farbe);
  const ort = d.ort || d.name;
  // Namen und Adressen der Vorlage ersetzen (Texte, E-Mail-Adressen, Links)
  const text = JSON.stringify(musterstadt).replace(/Musterstadt/g, d.name).replace(/musterstadt/g, slug);
  const vorlage = JSON.parse(text) as GemeindeConfig;
  const ohneBeispiele: Partial<GemeindeConfig> = d.demo
    ? {}
    : { abfall: undefined, kitas: undefined, vereine: undefined, veranstaltungen: undefined, ehrenamt: undefined, friedhoefe: undefined, orte: undefined, karte: undefined, ausschreibungen: undefined, wahlen: undefined, fundsachen: undefined, stichtage: undefined, ratsinfo: { sitzungen: [] } };
  return {
    ...vorlage,
    ...ohneBeispiele,
    slug,
    name: d.name,
    art: d.art,
    wappen: `/api/mandanten/${slug}/wappen`,
    wappenAlt: `Wappen ${d.art === "Landkreis" ? "des" : "der"} ${d.art} ${d.name}`,
    akzentfarbe: hell,
    akzentfarbeDunkel: barrierefreiDunkel(d.farbe),
    paket: d.paket,
    einwohner: d.einwohner,
    kontakt: { ...vorlage.kontakt, bezeichnung: `${d.art === "Stadt" ? "Stadtverwaltung" : d.art === "Landkreis" ? "Landratsamt" : "Verwaltung"} ${d.name}`, strasse: d.strasse, plz: d.plz, ort, email: d.email, telefon: vorlage.kontakt.telefon },
    email: { absenderName: `Bürgerservice ${d.name}`, absenderAdresse: d.email },
    rechtliches: { ...vorlage.rechtliches, verantwortlich: `${d.art} ${d.name}, ${d.strasse}, ${d.plz} ${ort}` },
    landkreis: undefined,
    gemeinden: undefined,
  };
}

export async function legeMandantAn(d: NeueGemeinde, benutzer: string) {
  let slug = slugAus(d.name) || "gemeinde";
  const belegt = new Set((await alleGemeinden()).map((x) => x.config.slug));
  for (let i = 2; belegt.has(slug); i++) slug = `${slugAus(d.name)}-${i}`;
  const config = baueGemeinde(d, slug);
  const probleme = pruefeGemeinde(config);
  if (probleme.length) return { probleme };
  const r: MandantRecord = {
    id: slug,
    tenant: slug,
    config,
    demo: d.demo,
    erstelltVon: benutzer,
    wappen: d.wappen ?? { typ: "image/svg+xml", daten: erzeugeWappen(d.name, config.akzentfarbe) },
    erstelltAm: new Date().toISOString(),
    // Demo-Gemeinden räumen sich nach 60 Tagen selbst auf
    loeschenAm: d.demo ? inTagen(60) : "9999-12-31T00:00:00.000Z",
  };
  await store().put("mandanten", r);
  g.__mandanten = undefined;
  return { mandant: r };
}

export async function aendereMandant(slug: string, aenderung: Partial<Pick<GemeindeConfig, "paket" | "einwohner">>) {
  const m = await store().get<MandantRecord>("mandanten", slug);
  if (!m) return false;
  await store().put("mandanten", { ...m, config: { ...m.config, ...aenderung } });
  g.__mandanten = undefined;
  return true;
}

export async function loescheMandant(slug: string) {
  if (tenants[slug]) return false;
  await store().delete("mandanten", slug);
  g.__mandanten = undefined;
  return true;
}
