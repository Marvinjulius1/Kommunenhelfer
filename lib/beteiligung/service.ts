/**
 * Bürgerbeteiligung: Umfragen und Ideen.
 *  - Teilnahme nur mit Bürgerkonto (eine Stimme pro Person, optional nur mit Online-Ausweis)
 *  - Stimmen werden nur als Summen gespeichert; wer abgestimmt hat, lässt sich nicht
 *    mit dem Ergebnis verknüpfen (HMAC je Umfrage)
 *  - Ideen erscheinen erst nach Prüfung durch die Redaktion (Schutz vor Beleidigungen
 *    und personenbezogenen Daten)
 */
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { zweckSchluessel } from "@/lib/crypto";
import { stelleZu } from "@/lib/postfach/service";
import type { IdeeRecord, KontoRecord, UmfrageRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

export const IDEE_KATEGORIEN = ["Verkehr", "Umwelt und Grün", "Kinder und Jugend", "Kultur und Freizeit", "Digitales", "Sonstiges"];

export const IDEE_STATUS: Record<IdeeRecord["status"], string> = {
  eingereicht: "Wird geprüft",
  veroeffentlicht: "Veröffentlicht",
  abgelehnt: "Nicht veröffentlicht",
  in_pruefung: "Verwaltung prüft",
  umgesetzt: "Umgesetzt",
};

const marke = (zweck: string, kontoId: string) => createHmac("sha256", zweckSchluessel("beteiligung")).update(`${zweck}:${kontoId}`).digest("hex");

// Abstimmungen nacheinander, damit keine Stimme verloren geht
const g = globalThis as { __beteiligungKette?: Promise<unknown> };
function nacheinander<T>(fn: () => Promise<T>): Promise<T> {
  const p = (g.__beteiligungKette ?? Promise.resolve()).then(fn, fn);
  g.__beteiligungKette = p.catch(() => undefined);
  return p;
}

// ------------------------------------------------------------------ Umfragen

export function umfrageOffen(u: UmfrageRecord) {
  return !u.beendet && u.bis >= new Date().toISOString();
}

export function umfrageSicht(u: UmfrageRecord, konto?: KontoRecord) {
  const offen = umfrageOffen(u);
  const zeigen = !offen || u.ergebnisSofort;
  const gesamt = u.teilnahmen.length;
  return {
    id: u.id,
    titel: u.titel,
    beschreibung: u.beschreibung,
    optionen: u.optionen,
    mehrfach: u.mehrfach,
    bis: u.bis,
    ortsteil: u.ortsteil,
    offen,
    nurOnlineAusweis: u.nurOnlineAusweis,
    teilgenommen: konto ? u.teilnahmen.includes(marke(`umfrage:${u.id}`, konto.id)) : false,
    teilnehmer: gesamt,
    ergebnis: zeigen ? u.optionen.map((o) => ({ id: o.id, label: o.label, stimmen: u.stimmen[o.id] ?? 0 })) : undefined,
  };
}

export async function umfragen(tenant: GemeindeConfig, alle = false) {
  return (await store().list<UmfrageRecord>("umfragen", (u) => u.tenant === tenant.slug && (alle || umfrageOffen(u) || u.bis >= inTagen(-90)))).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function ladeUmfrage(tenant: GemeindeConfig, id: string) {
  const u = await store().get<UmfrageRecord>("umfragen", id);
  return u && u.tenant === tenant.slug ? u : undefined;
}

export async function legeUmfrageAn(
  tenant: GemeindeConfig,
  d: { titel: string; beschreibung: string; optionen: string[]; mehrfach: boolean; bis: string; ortsteil?: string; ergebnisSofort: boolean; nurOnlineAusweis: boolean; autor: string },
) {
  const r: UmfrageRecord = {
    id: randomBytes(8).toString("base64url"),
    tenant: tenant.slug,
    titel: d.titel,
    beschreibung: d.beschreibung,
    optionen: d.optionen.map((label, i) => ({ id: `o${i + 1}`, label })),
    mehrfach: d.mehrfach,
    bis: d.bis,
    ortsteil: d.ortsteil,
    ergebnisSofort: d.ergebnisSofort,
    nurOnlineAusweis: d.nurOnlineAusweis,
    stimmen: {},
    teilnahmen: [],
    autor: d.autor,
    erstelltAm: new Date().toISOString(),
    // Ergebnisse bleiben ein Jahr nach Ende abrufbar
    loeschenAm: new Date(new Date(d.bis).getTime() + 365 * 86400_000).toISOString(),
  };
  await store().put("umfragen", r);
  return r;
}

export async function beendeUmfrage(tenant: GemeindeConfig, id: string) {
  const u = await ladeUmfrage(tenant, id);
  if (!u) return false;
  await store().put("umfragen", { ...u, beendet: true });
  return true;
}

export type AbstimmFehler = "nicht_gefunden" | "beendet" | "schon_abgestimmt" | "ungueltig" | "online_ausweis_noetig";

export async function stimmeAb(tenant: GemeindeConfig, id: string, konto: KontoRecord, wahl: string[]): Promise<{ ok: true } | { ok: false; fehler: AbstimmFehler }> {
  return nacheinander(async () => {
    const u = await ladeUmfrage(tenant, id);
    if (!u) return { ok: false, fehler: "nicht_gefunden" };
    if (!umfrageOffen(u)) return { ok: false, fehler: "beendet" };
    if (u.nurOnlineAusweis && konto.vertrauensniveau !== "hoch") return { ok: false, fehler: "online_ausweis_noetig" };
    const ids = [...new Set(wahl)];
    if (!ids.length || (!u.mehrfach && ids.length > 1) || ids.some((w) => !u.optionen.some((o) => o.id === w))) return { ok: false, fehler: "ungueltig" };
    const m = marke(`umfrage:${u.id}`, konto.id);
    if (u.teilnahmen.includes(m)) return { ok: false, fehler: "schon_abgestimmt" };
    const stimmen = { ...u.stimmen };
    for (const w of ids) stimmen[w] = (stimmen[w] ?? 0) + 1;
    // Reihenfolge der Teilnahmen mischen, damit sie nicht mit Zeitpunkten abgeglichen werden kann
    const teilnahmen = [...u.teilnahmen, m].sort();
    await store().put("umfragen", { ...u, stimmen, teilnahmen });
    return { ok: true };
  });
}

// ------------------------------------------------------------------ Ideen

export function ideeSicht(i: IdeeRecord, konto?: KontoRecord) {
  const m = konto ? marke("idee", konto.id) : undefined;
  return {
    id: i.id,
    titel: i.titel,
    text: i.text,
    kategorie: i.kategorie,
    ortsteil: i.ortsteil,
    status: i.status,
    statusLabel: IDEE_STATUS[i.status],
    antwort: i.antwort,
    unterstuetzer: i.unterstuetzer.length,
    unterstuetzt: !!m && i.unterstuetzer.includes(m),
    eigene: !!m && i.autorIndex === m,
    erstelltAm: i.erstelltAm,
  };
}

/** Öffentlich: nur geprüfte Ideen. Eigene (auch ungeprüfte) sieht der Autor zusätzlich. */
export async function ideen(tenant: GemeindeConfig, konto?: KontoRecord) {
  const m = konto ? marke("idee", konto.id) : undefined;
  return (await store().list<IdeeRecord>("ideen", (i) => i.tenant === tenant.slug && (["veroeffentlicht", "in_pruefung", "umgesetzt"].includes(i.status) || (!!m && i.autorIndex === m)))).sort(
    (a, b) => b.unterstuetzer.length - a.unterstuetzer.length || b.erstelltAm.localeCompare(a.erstelltAm),
  );
}

export async function alleIdeen(tenant: GemeindeConfig) {
  return (await store().list<IdeeRecord>("ideen", (i) => i.tenant === tenant.slug)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function reicheIdeeEin(tenant: GemeindeConfig, konto: KontoRecord, d: { titel: string; text: string; kategorie: string; ortsteil?: string }) {
  const m = marke("idee", konto.id);
  const offen = await store().list<IdeeRecord>("ideen", (i) => i.tenant === tenant.slug && i.autorIndex === m && i.status === "eingereicht");
  if (offen.length >= 3) return { ok: false as const, fehler: "zu_viele" };
  const r: IdeeRecord = {
    id: randomBytes(8).toString("base64url"),
    tenant: tenant.slug,
    ...d,
    autorIndex: m,
    kontoId: konto.id,
    status: "eingereicht",
    unterstuetzer: [],
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(730),
  };
  await store().put("ideen", r);
  return { ok: true as const, idee: r };
}

export async function unterstuetze(tenant: GemeindeConfig, id: string, konto: KontoRecord, an: boolean) {
  return nacheinander(async () => {
    const i = await store().get<IdeeRecord>("ideen", id);
    if (!i || i.tenant !== tenant.slug || !["veroeffentlicht", "in_pruefung"].includes(i.status)) return undefined;
    const m = marke("idee", konto.id);
    if (i.autorIndex === m) return i; // eigene Idee nicht selbst unterstützen
    const set = new Set(i.unterstuetzer);
    if (an) set.add(m);
    else set.delete(m);
    const neu = { ...i, unterstuetzer: [...set].sort() };
    await store().put("ideen", neu);
    return neu;
  });
}

/** Redaktion: freigeben, ablehnen, Status setzen, Stellungnahme. Der Autor wird benachrichtigt. */
export async function moderiere(tenant: GemeindeConfig, id: string, d: { status: IdeeRecord["status"]; antwort?: string; benutzer: string }) {
  const i = await store().get<IdeeRecord>("ideen", id);
  if (!i || i.tenant !== tenant.slug) return false;
  const neu: IdeeRecord = { ...i, status: d.status, antwort: d.antwort?.trim() || i.antwort, geprueftVon: d.benutzer };
  await store().put("ideen", neu);
  if (i.kontoId && (d.status !== i.status || (d.antwort && d.antwort !== i.antwort))) {
    await stelleZu({
      tenant,
      art: "nachricht",
      kontoId: i.kontoId,
      titel: `Ihre Idee „${i.titel}“: ${IDEE_STATUS[d.status]}`,
      text: `${neu.antwort ? `${neu.antwort}\n\n` : ""}Vielen Dank, dass Sie sich für ${tenant.name} engagieren.`,
      absender: tenant.name,
      tage: 180,
    }).catch(() => undefined);
  }
  return true;
}
