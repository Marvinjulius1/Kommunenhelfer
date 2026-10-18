/** Briefwahl: Wahlen (Konfiguration + Backoffice) und die eingegangenen Anträge je Wahl. */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig, Wahl } from "@/config/types";
import { decryptJson } from "@/lib/crypto";
import { aktiv } from "@/lib/funktionen";
import type { VorgangDaten, VorgangRecord } from "@/lib/records";
import { store, type StoredRecord } from "@/lib/storage/store";
import { BRIEFWAHL_ID, briefwahlLeistung, offen, personSchluessel } from "./wahlen";

export interface WahlRecord extends StoredRecord, Wahl {
  angelegtVon: string;
}

const g = globalThis as { __wahlCache?: Map<string, { zeit: number; daten: WahlRecord[] }> };
const cache = (g.__wahlCache ??= new Map());

async function gespeicherte(tenant: string): Promise<WahlRecord[]> {
  const c = cache.get(tenant);
  if (c && Date.now() - c.zeit < 10_000) return c.daten;
  const daten = await store().list<WahlRecord>("wahlen", (w) => w.tenant === tenant);
  cache.set(tenant, { zeit: Date.now(), daten });
  return daten;
}

/** Alle Wahlen der Gemeinde, nach Wahltag sortiert. */
export async function alleWahlen(tenant: GemeindeConfig): Promise<(Wahl & { quelle: "datei" | "backoffice" })[]> {
  const eigene = await gespeicherte(tenant.slug);
  return [
    ...(tenant.wahlen ?? []).filter((w) => !eigene.some((e) => e.id === w.id)).map((w) => ({ ...w, quelle: "datei" as const })),
    ...eigene.map(({ id, titel, datum, antragBis }) => ({ id, titel, datum, antragBis, quelle: "backoffice" as const })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}

export async function offeneWahlen(tenant: GemeindeConfig, jetzt = new Date()) {
  return (await alleWahlen(tenant)).filter((w) => offen(w, jetzt));
}

/** Fügt die Leistung „Briefwahl beantragen“ hinzu (Teil von getTenant). */
export async function mitBriefwahl(tenant: GemeindeConfig): Promise<GemeindeConfig> {
  if (!aktiv(tenant, "briefwahl") || tenant.leistungen.some((l) => l.id === BRIEFWAHL_ID)) return tenant;
  const offene = await offeneWahlen(tenant);
  if (!offene.length && !tenant.wahlen?.length && !(await gespeicherte(tenant.slug)).length) return tenant;
  return { ...tenant, leistungen: [...tenant.leistungen, briefwahlLeistung(tenant, offene)] };
}

export async function legeWahlAn(tenant: GemeindeConfig, w: Omit<Wahl, "id">, benutzer: string) {
  const r: WahlRecord = {
    ...w,
    id: `w${randomBytes(5).toString("hex")}`,
    tenant: tenant.slug,
    erstelltAm: new Date().toISOString(),
    // Ohne Personenbezug – ein Jahr nach der Wahl entfernen
    loeschenAm: new Date(Date.parse(`${w.datum}T12:00:00Z`) + 365 * 86400_000).toISOString(),
    angelegtVon: benutzer,
  };
  await store().put("wahlen", r);
  cache.delete(tenant.slug);
  return r;
}

export async function loescheWahl(tenant: GemeindeConfig, id: string) {
  const w = await store().get<WahlRecord>("wahlen", id);
  if (!w || w.tenant !== tenant.slug) return false;
  await store().delete("wahlen", id);
  cache.delete(tenant.slug);
  return true;
}

export interface Briefwahlantrag {
  v: VorgangRecord;
  w: Record<string, string>;
  email: string;
  doppelt: boolean;
}

/** Anträge zu einer Wahl – mit Markierung möglicher Doppelanträge (gleicher Name und Geburtstag). */
export async function antraegeFuer(tenant: GemeindeConfig, wahlId: string): Promise<Briefwahlantrag[]> {
  const liste = (await store().list<VorgangRecord>("vorgaenge", (v) => v.tenant === tenant.slug && v.leistungId === BRIEFWAHL_ID))
    .map((v) => {
      const d = decryptJson<VorgangDaten>(v.daten);
      return { v, w: d.werte ?? {}, email: d.kontakt.email };
    })
    .filter((a) => a.w.wahl === wahlId)
    .sort((a, b) => a.v.erstelltAm.localeCompare(b.v.erstelltAm));
  const anzahl = new Map<string, number>();
  for (const a of liste) anzahl.set(personSchluessel(wahlId, a.w), (anzahl.get(personSchluessel(wahlId, a.w)) ?? 0) + 1);
  return liste.map((a) => ({ ...a, doppelt: (anzahl.get(personSchluessel(wahlId, a.w)) ?? 0) > 1 }));
}


