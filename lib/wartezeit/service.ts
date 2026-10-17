/**
 * Live-Wartezeit und Wartenummern.
 * Bürger ziehen eine Nummer online (oder am Gerät im Rathaus), sehen ihre Position
 * und werden – mit Konto – kurz vorher benachrichtigt. Das Backoffice ruft auf.
 * Gespeichert wird nur Amt, Nummer und Zeitpunkte; ohne Konto keine Personendaten.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { Amt, GemeindeConfig, Wochentag } from "@/config/types";
import { hashToken, safeEqualHex } from "@/lib/crypto";
import { istFeiertag } from "@/lib/feiertage";
import { tx } from "@/lib/i18n";
import { benachrichtige } from "@/lib/push/service";
import type { WarteRecord } from "@/lib/records";
import { zaehle } from "@/lib/statistik";
import { inTagen, store } from "@/lib/storage/store";

const TAGE: Wochentag[] = ["so", "mo", "di", "mi", "do", "fr", "sa"];

function jetztBerlin(d = new Date()) {
  const teile = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(d);
  const get = (t: string) => teile.find((p) => p.type === t)?.value ?? "";
  const datum = `${get("year")}-${get("month")}-${get("day")}`;
  return { datum, zeit: `${get("hour")}:${get("minute")}`, tag: TAGE[new Date(datum + "T12:00:00Z").getUTCDay()] };
}

/** Ämter mit Wartenummern: alle mit Terminzeiten (dort gibt es Schalter). */
export function wartendeAemter(tenant: GemeindeConfig): Amt[] {
  return tenant.aemter.filter((a) => a.termine);
}

/** Ist das Amt gerade geöffnet? (Terminzeiten des Amts, Schließ- und Feiertage beachtet) */
export function geoeffnet(tenant: GemeindeConfig, amt: Amt, d = new Date()): boolean {
  const { datum, zeit, tag } = jetztBerlin(d);
  if (tenant.schliesstage.includes(datum) || istFeiertag(datum)) return false;
  const fenster = amt.termine?.zeiten[tag] ?? tenant.oeffnungszeiten[tag] ?? [];
  return fenster.some(([von, bis]) => zeit >= von && zeit < bis);
}

async function heute(tenant: GemeindeConfig, amtId: string) {
  const { datum } = jetztBerlin();
  return (await store().list<WarteRecord>("wartenummern", (w) => w.tenant === tenant.slug && w.amtId === amtId && w.datum === datum)).sort((a, b) => a.nummer - b.nummer);
}

/** Prozessweite Reihenfolge, damit keine Nummer doppelt vergeben wird. */
const g = globalThis as { __warteSperre?: Promise<unknown> };
function nacheinander<T>(fn: () => Promise<T>): Promise<T> {
  const p = (g.__warteSperre ?? Promise.resolve()).then(fn, fn);
  g.__warteSperre = p.catch(() => undefined);
  return p;
}

/** Durchschnittliche Bearbeitungszeit heute (Minuten), sonst die Terminlänge. */
function bearbeitungsMinuten(amt: Amt, liste: WarteRecord[]): number {
  const dauer = liste
    .filter((w) => w.aufgerufenAm && w.erledigtAm)
    .slice(-10)
    .map((w) => (Date.parse(w.erledigtAm!) - Date.parse(w.aufgerufenAm!)) / 60000)
    .filter((m) => m > 0.5 && m < 120);
  return dauer.length >= 3 ? dauer.reduce((s, m) => s + m, 0) / dauer.length : (amt.termine?.slotMinuten ?? 10);
}

export interface AmtStand {
  amtId: string;
  name: string;
  geoeffnet: boolean;
  wartend: number;
  minuten: number;
  aufgerufen: { nummer: number; schalter?: string }[];
}

export async function stand(tenant: GemeindeConfig, amt: Amt): Promise<AmtStand> {
  const liste = await heute(tenant, amt.id);
  const wartend = liste.filter((w) => w.status === "wartend").length;
  const parallel = Math.max(1, amt.termine?.parallel ?? 1);
  return {
    amtId: amt.id,
    name: tx(amt.name, "de"),
    geoeffnet: geoeffnet(tenant, amt),
    wartend,
    minuten: Math.round((wartend * bearbeitungsMinuten(amt, liste)) / parallel),
    aufgerufen: liste
      .filter((w) => w.status === "aufgerufen")
      .slice(-4)
      .map((w) => ({ nummer: w.nummer, schalter: w.schalter })),
  };
}

export function anzeigeNummer(amt: Amt, n: number) {
  return `${amt.id.slice(0, 1).toUpperCase()}${String(n).padStart(3, "0")}`;
}

export async function zieheNummer(tenant: GemeindeConfig, amt: Amt, kontoId?: string) {
  return nacheinander(async () => {
    const liste = await heute(tenant, amt.id);
    const token = randomBytes(18).toString("base64url");
    const r: WarteRecord = {
      id: randomBytes(9).toString("base64url"),
      tenant: tenant.slug,
      amtId: amt.id,
      datum: jetztBerlin().datum,
      nummer: (liste.at(-1)?.nummer ?? 0) + 1,
      status: "wartend",
      tokenHash: hashToken(token),
      kontoId,
      erstelltAm: new Date().toISOString(),
      loeschenAm: inTagen(2),
    };
    await store().put("wartenummern", r);
    await zaehle(tenant.slug, "wartemarken");
    return { record: r, token };
  });
}

export async function ladeNummer(tenant: GemeindeConfig, id: string, token?: string | null, kontoId?: string) {
  const w = await store().get<WarteRecord>("wartenummern", id);
  if (!w || w.tenant !== tenant.slug) return undefined;
  const erlaubt = (token && safeEqualHex(hashToken(token), w.tokenHash)) || (kontoId && w.kontoId === kontoId);
  return erlaubt ? w : undefined;
}

export async function position(tenant: GemeindeConfig, w: WarteRecord) {
  const amt = tenant.aemter.find((a) => a.id === w.amtId)!;
  const liste = await heute(tenant, w.amtId);
  const vor = liste.filter((x) => x.status === "wartend" && x.nummer < w.nummer).length;
  const parallel = Math.max(1, amt.termine?.parallel ?? 1);
  return {
    id: w.id,
    nummer: anzeigeNummer(amt, w.nummer),
    amt: tx(amt.name, "de"),
    ort: amt.ort,
    status: w.status,
    schalter: w.schalter,
    vor,
    minuten: Math.round((vor * bearbeitungsMinuten(amt, liste)) / parallel),
  };
}

export async function storniere(w: WarteRecord) {
  if (w.status === "wartend") await store().put("wartenummern", { ...w, status: "storniert" });
}

/** Backoffice: nächste Nummer aufrufen. Benachrichtigt Konten, die bald dran sind. */
export async function rufeAuf(tenant: GemeindeConfig, amt: Amt, schalter: string) {
  return nacheinander(async () => {
    const liste = await heute(tenant, amt.id);
    const naechste = liste.find((w) => w.status === "wartend");
    if (!naechste) return undefined;
    const jetzt = new Date().toISOString();
    await store().put("wartenummern", { ...naechste, status: "aufgerufen", aufgerufenAm: jetzt, schalter });
    const n = anzeigeNummer(amt, naechste.nummer);
    if (naechste.kontoId) await benachrichtige(tenant, { kontoIds: [naechste.kontoId], titel: `Sie sind dran: ${n}`, text: `Bitte kommen Sie zu ${schalter}.`, url: `/wartezeit/${naechste.id}` });
    // Wer jetzt noch zwei Personen vor sich hat, bekommt einen Hinweis
    const bald = liste.filter((w) => w.status === "wartend" && w.id !== naechste.id)[2];
    if (bald?.kontoId && !bald.vorgemerkt) {
      await benachrichtige(tenant, { kontoIds: [bald.kontoId], titel: "Gleich sind Sie dran", text: `Nur noch zwei Personen vor Ihnen (${anzeigeNummer(amt, bald.nummer)}). Bitte kommen Sie ins ${tx(amt.name, "de")}.`, url: `/wartezeit/${bald.id}` });
      await store().put("wartenummern", { ...bald, vorgemerkt: true });
    }
    return { ...naechste, status: "aufgerufen" as const, schalter, anzeige: n };
  });
}

export async function schliesseAb(tenant: GemeindeConfig, id: string, status: "erledigt" | "nicht_erschienen") {
  const w = await store().get<WarteRecord>("wartenummern", id);
  if (!w || w.tenant !== tenant.slug || w.status !== "aufgerufen") return false;
  await store().put("wartenummern", { ...w, status, erledigtAm: new Date().toISOString() });
  return true;
}

export async function warteliste(tenant: GemeindeConfig, amtId: string) {
  return heute(tenant, amtId);
}
