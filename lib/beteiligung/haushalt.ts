/**
 * Bürgerhaushalt: Die Gemeinde stellt ein Budget und Projekte zur Wahl.
 * Jede Person verteilt das Budget auf Projekte (Summe ≤ Budget) – eine Teilnahme
 * pro Konto, gespeichert nur als HMAC; Stimmen nur als Summen.
 * Ergebnis: Projekte nach Stimmen, umgesetzt wird, solange das Budget reicht.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import type { BuergerhaushaltRecord, KontoRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";
import { marke, nacheinander } from "./service";

export function haushaltOffen(h: BuergerhaushaltRecord) {
  return !h.beendet && h.bis >= new Date().toISOString();
}

/** Projekte nach Stimmen; „finanziert“, solange das Budget reicht (übersprungen wird, was nicht mehr passt). */
export function ergebnis(h: Pick<BuergerhaushaltRecord, "projekte" | "stimmen" | "budgetEuro">) {
  let rest = h.budgetEuro;
  return [...h.projekte]
    .map((p) => ({ ...p, stimmen: h.stimmen[p.id] ?? 0 }))
    .sort((a, b) => b.stimmen - a.stimmen || a.kostenEuro - b.kostenEuro)
    .map((p) => {
      const finanziert = p.stimmen > 0 && p.kostenEuro <= rest;
      if (finanziert) rest -= p.kostenEuro;
      return { ...p, finanziert };
    });
}

export function haushaltSicht(h: BuergerhaushaltRecord, konto?: KontoRecord) {
  const offen = haushaltOffen(h);
  return {
    id: h.id,
    titel: h.titel,
    text: h.text,
    budgetEuro: h.budgetEuro,
    bis: h.bis,
    offen,
    nurOnlineAusweis: h.nurOnlineAusweis,
    projekte: h.projekte,
    teilnehmer: h.teilnahmen.length,
    teilgenommen: konto ? h.teilnahmen.includes(marke(`haushalt:${h.id}`, konto.id)) : false,
    ergebnis: offen ? undefined : ergebnis(h),
  };
}

export async function haushalte(tenant: GemeindeConfig) {
  return (await store().list<BuergerhaushaltRecord>("buergerhaushalte", (h) => h.tenant === tenant.slug)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function ladeHaushalt(tenant: GemeindeConfig, id: string) {
  const h = await store().get<BuergerhaushaltRecord>("buergerhaushalte", id);
  return h && h.tenant === tenant.slug ? h : undefined;
}

export async function legeHaushaltAn(tenant: GemeindeConfig, d: { titel: string; text: string; budgetEuro: number; bis: string; nurOnlineAusweis: boolean; projekte: { titel: string; text: string; kostenEuro: number; ortsteil?: string }[]; autor: string }) {
  const r: BuergerhaushaltRecord = {
    id: randomBytes(8).toString("base64url"),
    tenant: tenant.slug,
    titel: d.titel,
    text: d.text,
    budgetEuro: d.budgetEuro,
    bis: d.bis,
    nurOnlineAusweis: d.nurOnlineAusweis,
    projekte: d.projekte.map((p, i) => ({ ...p, id: `p${i + 1}` })),
    stimmen: {},
    teilnahmen: [],
    autor: d.autor,
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(730, new Date(d.bis)),
  };
  await store().put("buergerhaushalte", r);
  return r;
}

export async function waehle(tenant: GemeindeConfig, id: string, konto: KontoRecord, auswahl: string[]): Promise<"ok" | "geschlossen" | "schon" | "ausweis" | "budget" | "ungueltig"> {
  return nacheinander(async () => {
    const h = await ladeHaushalt(tenant, id);
    if (!h || !haushaltOffen(h)) return "geschlossen";
    if (h.nurOnlineAusweis && konto.vertrauensniveau !== "hoch") return "ausweis";
    const m = marke(`haushalt:${h.id}`, konto.id);
    if (h.teilnahmen.includes(m)) return "schon";
    const ids = [...new Set(auswahl)];
    if (!ids.length || ids.some((x) => !h.projekte.some((p) => p.id === x))) return "ungueltig";
    if (ids.reduce((s, x) => s + h.projekte.find((p) => p.id === x)!.kostenEuro, 0) > h.budgetEuro) return "budget";
    const stimmen = { ...h.stimmen };
    for (const x of ids) stimmen[x] = (stimmen[x] ?? 0) + 1;
    // Reihenfolge der Teilnahmen mischen, damit sie nicht mit der Zeit der Stimmabgabe korrelieren
    const teilnahmen = [...h.teilnahmen, m].sort();
    await store().put("buergerhaushalte", { ...h, stimmen, teilnahmen });
    return "ok";
  });
}

export async function beendeHaushalt(tenant: GemeindeConfig, id: string) {
  const h = await ladeHaushalt(tenant, id);
  if (!h) return false;
  await store().put("buergerhaushalte", { ...h, beendet: true });
  return true;
}
