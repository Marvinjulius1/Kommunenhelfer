/**
 * Krisenmodus: Bei Hochwasser, Stromausfall, Unwetter oder Evakuierung wird die
 * Startseite zur Lage-Seite – Notrufe, Hotline, Anlaufstellen, Verhaltenstipps
 * und fortlaufende Lagemeldungen. Keine Personendaten.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { aktiv } from "@/lib/funktionen";
import { inTagen, store, type StoredRecord } from "@/lib/storage/store";
import { VORLAGEN, type KrisenArt, type Lage } from "./vorlagen";

export interface KrisenRecord extends StoredRecord, Lage {
  aktiv: boolean;
  seit?: string;
  geaendertVon?: string;
  geaendertAm?: string;
}

// Prozessweit, damit ein Speichern den Cache aller Routen leert
const g = globalThis as { __kriseCache?: Map<string, { zeit: number; daten: KrisenRecord | undefined }> };
const cache = (g.__kriseCache ??= new Map());

async function lade(tenant: string) {
  const c = cache.get(tenant);
  if (c && Date.now() - c.zeit < 5_000) return c.daten;
  const daten = await store().get<KrisenRecord>("krise", tenant);
  cache.set(tenant, { zeit: Date.now(), daten });
  return daten;
}

/** Aktive Lage – oder undefined. */
export async function aktuelleLage(tenant: GemeindeConfig): Promise<KrisenRecord | undefined> {
  if (!aktiv(tenant, "krisenmodus")) return undefined;
  const k = await lade(tenant.slug);
  return k?.aktiv ? k : undefined;
}

/** Letzter Stand (auch beendet) – Grundlage für das Formular im Backoffice. */
export async function letzteLage(tenant: GemeindeConfig): Promise<KrisenRecord | undefined> {
  return lade(tenant.slug);
}

export function leereLage(tenant: GemeindeConfig, art: KrisenArt = "hochwasser"): Lage {
  const v = VORLAGEN[art];
  return {
    art,
    stufe: v.stufe,
    titel: v.titel,
    text: v.text.replace(/\{gemeinde\}/g, `${tenant.art} ${tenant.name}`),
    tipps: [...v.tipps],
    hotline: tenant.kontakt.telefon,
    notrufe: [
      { label: "Feuerwehr und Rettungsdienst", nummer: "112" },
      { label: "Polizei", nummer: "110" },
      { label: "Ärztlicher Bereitschaftsdienst", nummer: "116 117" },
    ],
    anlaufstellen: [],
    meldungen: [],
  };
}

async function speichere(tenant: GemeindeConfig, r: KrisenRecord) {
  // Öffentliche Informationen ohne Personenbezug – ein Jahr nach der letzten Änderung gelöscht
  await store().put("krise", { ...r, loeschenAm: inTagen(365) });
  cache.delete(tenant.slug);
  return r;
}

export async function setzeLage(tenant: GemeindeConfig, lage: Omit<Lage, "meldungen">, benutzer: string) {
  const alt = await lade(tenant.slug);
  const jetzt = new Date().toISOString();
  const neu = !alt?.aktiv;
  return speichere(tenant, {
    ...lage,
    id: tenant.slug,
    tenant: tenant.slug,
    erstelltAm: alt?.erstelltAm ?? jetzt,
    loeschenAm: inTagen(365),
    aktiv: true,
    seit: neu ? jetzt : alt!.seit,
    // Neue Lage beginnt mit leerem Verlauf
    meldungen: neu ? [] : alt!.meldungen,
    geaendertVon: benutzer,
    geaendertAm: jetzt,
  });
}

export async function meldeLage(tenant: GemeindeConfig, text: string, benutzer: string) {
  const alt = await lade(tenant.slug);
  if (!alt?.aktiv) return undefined;
  const jetzt = new Date().toISOString();
  return speichere(tenant, { ...alt, meldungen: [{ id: randomBytes(6).toString("base64url"), zeit: jetzt, text }, ...alt.meldungen].slice(0, 100), geaendertVon: benutzer, geaendertAm: jetzt });
}

export async function beendeLage(tenant: GemeindeConfig, benutzer: string) {
  const alt = await lade(tenant.slug);
  if (!alt?.aktiv) return undefined;
  return speichere(tenant, { ...alt, aktiv: false, geaendertVon: benutzer, geaendertAm: new Date().toISOString() });
}
