/**
 * Fundbüro: Fundsachen erfassen (Backoffice), öffentlich suchen, Anspruch melden.
 * Öffentlich ist nur eine allgemeine Beschreibung – Erkennungsmerkmale bleiben
 * intern, damit nur Eigentümer sie nennen können.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { encryptJson } from "@/lib/crypto";
import type { FundRecord } from "@/lib/records";
import { plusTage } from "@/lib/feiertage";
import { store } from "@/lib/storage/store";

/** Aufbewahrung im Fundbüro: 6 Monate (§ 973 BGB), danach noch 30 Tage zur Abwicklung. */
const AUFBEWAHRUNG_TAGE = 183 + 30;

export const FUND_KATEGORIEN = ["Schlüssel", "Geldbörse", "Handy / Elektronik", "Tasche / Rucksack", "Kleidung", "Schmuck / Uhr", "Fahrrad", "Ausweis / Karte", "Sonstiges"];

export interface FundOeffentlich {
  id: string;
  bezeichnung: string;
  kategorie: string;
  beschreibung: string;
  fundort: string;
  funddatum: string;
}

const sicht = (f: Pick<FundRecord, "id" | "bezeichnung" | "kategorie" | "beschreibung" | "fundort" | "funddatum">): FundOeffentlich => ({
  id: f.id,
  bezeichnung: f.bezeichnung,
  kategorie: f.kategorie,
  beschreibung: f.beschreibung,
  fundort: f.fundort,
  funddatum: f.funddatum,
});

/** Offene Fundsachen: aus dem Backoffice plus Beispieldaten der Config. */
export async function fundsachen(tenant: GemeindeConfig): Promise<FundOeffentlich[]> {
  const erfasst = await store().list<FundRecord>("fundsachen", (f) => f.tenant === tenant.slug && f.status === "offen");
  const beispiele = (tenant.fundsachen ?? []).map((f) => sicht({ ...f, id: `cfg-${f.id}` }));
  return [...erfasst.map(sicht), ...beispiele].sort((a, b) => b.funddatum.localeCompare(a.funddatum));
}

export async function ladeFund(tenant: GemeindeConfig, id: string): Promise<FundOeffentlich | undefined> {
  return (await fundsachen(tenant)).find((f) => f.id === id);
}

export function suche(liste: FundOeffentlich[], q: string, kategorie?: string): FundOeffentlich[] {
  const woerter = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return liste.filter((f) => {
    if (kategorie && f.kategorie !== kategorie) return false;
    const text = `${f.bezeichnung} ${f.beschreibung} ${f.fundort} ${f.kategorie}`.toLowerCase();
    return woerter.every((w) => text.includes(w));
  });
}

export async function erfasseFund(tenant: GemeindeConfig, f: { bezeichnung: string; kategorie: string; beschreibung: string; fundort: string; funddatum: string; intern?: string; benutzer: string }) {
  const r: FundRecord = {
    id: randomBytes(8).toString("base64url"),
    tenant: tenant.slug,
    bezeichnung: f.bezeichnung,
    kategorie: f.kategorie,
    beschreibung: f.beschreibung,
    fundort: f.fundort,
    funddatum: f.funddatum,
    status: "offen",
    intern: f.intern ? encryptJson(f.intern) : undefined,
    erfasstVon: f.benutzer,
    erstelltAm: new Date().toISOString(),
    loeschenAm: new Date(plusTage(f.funddatum, AUFBEWAHRUNG_TAGE) + "T00:00:00Z").toISOString(),
  };
  await store().put("fundsachen", r);
  return r;
}

export async function alleFunde(tenant: GemeindeConfig) {
  return (await store().list<FundRecord>("fundsachen", (f) => f.tenant === tenant.slug)).sort((a, b) => b.funddatum.localeCompare(a.funddatum));
}

export async function setzeFundStatus(tenant: GemeindeConfig, id: string, status: FundRecord["status"]) {
  const f = await store().get<FundRecord>("fundsachen", id);
  if (!f || f.tenant !== tenant.slug) return false;
  // Abgeholte Fundsachen nur noch 30 Tage aufbewahren
  await store().put("fundsachen", { ...f, status, loeschenAm: status === "abgeholt" ? new Date(Date.now() + 30 * 86400_000).toISOString() : f.loeschenAm });
  return true;
}
