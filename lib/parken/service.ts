/**
 * Verwarnungsgeld (ruhender Verkehr): nachsehen, online bezahlen oder Stellung nehmen.
 * Abruf nur mit Aktenzeichen UND Kennzeichen (zwei Merkmale + Rate-Limit).
 * Das Kennzeichen wird nur als HMAC gespeichert. Im Echtbetrieb kommen die Fälle
 * aus dem Fachverfahren des Ordnungsamts (Import oder Schnittstelle).
 */
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { zweckSchluessel } from "@/lib/crypto";
import { demoModus } from "@/lib/demo";
import type { VerwarnungRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

export const DEMO_FALL = { aktenzeichen: "VG-2026-004711", kennzeichen: "MS-AB 123" };

export function normalisiereKennzeichen(k: string) {
  return k.toUpperCase().replace(/[^A-ZÄÖÜ0-9]/g, "");
}
export function normalisiereAz(a: string) {
  return a.toUpperCase().replace(/\s+/g, "").slice(0, 30);
}

function kennzeichenIndex(tenant: string, k: string) {
  return createHmac("sha256", zweckSchluessel("index-kennzeichen")).update(`${tenant}:${normalisiereKennzeichen(k)}`).digest("hex");
}

export async function erfasse(tenant: GemeindeConfig, d: { aktenzeichen: string; kennzeichen: string; betragCent: number; tatbestand: string; tatzeit: string; tatort: string }, benutzer: string) {
  const r: VerwarnungRecord = {
    id: randomBytes(10).toString("base64url"),
    tenant: tenant.slug,
    aktenzeichen: normalisiereAz(d.aktenzeichen),
    kennzeichenIndex: kennzeichenIndex(tenant.slug, d.kennzeichen),
    betragCent: d.betragCent,
    tatbestand: d.tatbestand,
    tatzeit: d.tatzeit,
    tatort: d.tatort,
    status: "offen",
    erfasstVon: benutzer,
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(365),
  };
  await store().put("verwarnungen", r);
  return r;
}

async function demoFall(tenant: GemeindeConfig) {
  if (!demoModus()) return;
  const az = normalisiereAz(DEMO_FALL.aktenzeichen);
  if ((await store().list<VerwarnungRecord>("verwarnungen", (v) => v.tenant === tenant.slug && v.aktenzeichen === az)).length) return;
  const gestern = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  await erfasse(tenant, { ...DEMO_FALL, betragCent: 3500, tatbestand: "Parken im eingeschränkten Halteverbot", tatzeit: `${gestern}T10:42`, tatort: "Marktstraße 3" }, "demo");
}

export async function finde(tenant: GemeindeConfig, aktenzeichen: string, kennzeichen: string) {
  await demoFall(tenant);
  const az = normalisiereAz(aktenzeichen);
  const idx = kennzeichenIndex(tenant.slug, kennzeichen);
  return (await store().list<VerwarnungRecord>("verwarnungen", (v) => v.tenant === tenant.slug && v.aktenzeichen === az && v.kennzeichenIndex === idx))[0];
}

export async function liste(tenant: GemeindeConfig) {
  return (await store().list<VerwarnungRecord>("verwarnungen", (v) => v.tenant === tenant.slug)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function speichere(v: VerwarnungRecord) {
  await store().put("verwarnungen", v);
}
