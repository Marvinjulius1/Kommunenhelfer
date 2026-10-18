/** Zahlungen: anlegen, bezahlen (über Anbieter), Quittung. */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig, Leistung } from "@/config/types";
import type { VerwarnungRecord, ZahlungRecord } from "@/lib/records";
import { pruefeSignatur, signiere } from "@/lib/signatur";
import { inTagen, store } from "@/lib/storage/store";
import { zaehle } from "@/lib/statistik";
import { zahlungsAnbieter } from "./anbieter";

/** Kassenbelege werden 10 Jahre aufbewahrt (§ 147 AO analog). */
const AUFBEWAHRUNG_TAGE = 3653;

export async function legeZahlungAn(tenant: GemeindeConfig, z: { betragCent: number; zweck: string; kontoId?: string; vorgangId?: string; bezug?: ZahlungRecord["bezug"] }): Promise<ZahlungRecord> {
  const r: ZahlungRecord = {
    id: `Z${randomBytes(9).toString("base64url")}`,
    tenant: tenant.slug,
    kontoId: z.kontoId,
    vorgangId: z.vorgangId,
    bezug: z.bezug,
    betragCent: Math.round(z.betragCent),
    zweck: z.zweck.slice(0, 140),
    status: "offen",
    anbieter: zahlungsAnbieter()?.id ?? "keiner",
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(AUFBEWAHRUNG_TAGE),
  };
  await store().put("zahlungen", r);
  return r;
}

/** Betrag einer Online-Leistung (z. B. 12 € × Anzahl Urkunden). */
export function betragFuer(l: Leistung, werte: Record<string, string>): number | null {
  if (!l.bezahlung) return null;
  const menge = l.bezahlung.mengeFeld ? Math.max(1, Number(werte[l.bezahlung.mengeFeld]) || 1) : 1;
  const erste = Math.round(l.bezahlung.betrag * 100);
  const weitere = l.bezahlung.weitere === undefined ? erste : Math.round(l.bezahlung.weitere * 100);
  return erste + (Math.min(menge, 99) - 1) * weitere;
}

/** Zugang zur Bezahlseite ohne Konto: signierter Link, 30 Tage gültig. */
export function zahlungZugang(z: ZahlungRecord) {
  return signiere({ z: z.id }, 30 * 86400, "zahlung");
}
export function pruefeZahlungZugang(token: string | null | undefined, id: string) {
  return pruefeSignatur<{ z: string }>(token, "zahlung")?.z === id;
}

export async function ladeZahlung(tenant: GemeindeConfig, id: string) {
  const z = await store().get<ZahlungRecord>("zahlungen", id);
  return z && z.tenant === tenant.slug ? z : undefined;
}

export async function markiereBezahlt(z: ZahlungRecord, methode: string, referenz: string) {
  if (z.status === "bezahlt") return z;
  const neu: ZahlungRecord = { ...z, status: "bezahlt", methode, referenz, bezahltAm: new Date().toISOString() };
  await store().put("zahlungen", neu);
  await zaehle(z.tenant, "zahlungen");
  await zaehle(z.tenant, "zahlungen_cent", z.betragCent);
  // Verwarnungsgeld: als bezahlt markieren
  if (z.bezug?.art === "verwarnung") {
    const v = await store().get<VerwarnungRecord>("verwarnungen", z.bezug.id);
    if (v) await store().put("verwarnungen", { ...v, status: "bezahlt" });
  }
  return neu;
}

export async function zahlungenVon(filter: (z: ZahlungRecord) => boolean) {
  return (await store().list<ZahlungRecord>("zahlungen", filter)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export function euro(cent: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);
}
