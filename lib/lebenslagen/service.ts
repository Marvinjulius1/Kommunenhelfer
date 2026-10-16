/** Lebenslagen: persönliche Checklisten mit Fristen im Bürgerkonto. */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig, Lebenslage } from "@/config/types";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { plusTage } from "@/lib/feiertage";
import { tx } from "@/lib/i18n";
import type { ChecklisteInhalt, ChecklisteRecord, KontoRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

/** Checklisten werden ein Jahr nach dem Stichtag gelöscht (spätestens mit dem Konto). */
const NACH_STICHTAG_TAGE = 365;
export const MAX_CHECKLISTEN = 10;

export interface Schrittstand {
  id: string;
  titel: string;
  text?: string;
  href?: string;
  extern?: string;
  frist?: string;
  erledigt: boolean;
}

export function lebenslage(tenant: GemeindeConfig, id: string): Lebenslage | undefined {
  return tenant.lebenslagen?.find((l) => l.id === id);
}

/** Link eines Schritts: Online-Antrag, Termin oder eigene Seite. */
export function schrittLink(tenant: GemeindeConfig, s: Lebenslage["schritte"][number]): string | undefined {
  if (s.href) return s.href;
  const l = s.leistungId ? tenant.leistungen.find((x) => x.id === s.leistungId && x.aktiv) : undefined;
  if (!l) return undefined;
  return l.online && l.formular ? `/antrag/${l.id}` : l.termin ? `/termine?leistung=${l.id}` : "/leistungen";
}

export function schritte(tenant: GemeindeConfig, ll: Lebenslage, stichtag: string | undefined, erledigt: string[], lang: "de" | "en" = "de"): Schrittstand[] {
  return ll.schritte.map((s) => ({
    id: s.id,
    titel: tx(s.titel, lang),
    text: s.text ? tx(s.text, lang) : undefined,
    href: schrittLink(tenant, s),
    extern: s.extern ? tx(s.extern, lang) : undefined,
    frist: stichtag && s.tage !== undefined ? plusTage(stichtag, s.tage) : undefined,
    erledigt: erledigt.includes(s.id),
  }));
}

export function inhalt(r: ChecklisteRecord): ChecklisteInhalt {
  return decryptJson<ChecklisteInhalt>(r.inhalt);
}

export async function checklistenVon(k: Pick<KontoRecord, "id">) {
  return (await store().list<ChecklisteRecord>("checklisten", (c) => c.kontoId === k.id)).sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm));
}

export async function ladeCheckliste(k: Pick<KontoRecord, "id">, id: string) {
  const c = await store().get<ChecklisteRecord>("checklisten", id);
  return c && c.kontoId === k.id ? c : undefined;
}

function loeschDatum(stichtag: string) {
  const ab = new Date(plusTage(stichtag, NACH_STICHTAG_TAGE) + "T00:00:00Z");
  return ab > new Date() ? ab.toISOString() : inTagen(30);
}

export async function speichereCheckliste(k: KontoRecord, i: ChecklisteInhalt, id?: string, erstelltAm?: string) {
  const r: ChecklisteRecord = {
    id: id ?? randomBytes(12).toString("base64url"),
    tenant: k.tenant,
    kontoId: k.id,
    inhalt: encryptJson(i),
    erstelltAm: erstelltAm ?? new Date().toISOString(),
    loeschenAm: loeschDatum(i.stichtag),
  };
  await store().put("checklisten", r);
  return r;
}

export function checklisteSicht(tenant: GemeindeConfig, r: ChecklisteRecord) {
  const i = inhalt(r);
  const ll = lebenslage(tenant, i.lebenslageId);
  if (!ll) return undefined;
  const liste = schritte(tenant, ll, i.stichtag, i.erledigt);
  return { id: r.id, lebenslageId: ll.id, titel: tx(ll.titel, "de"), stichtagLabel: tx(ll.stichtag, "de"), stichtag: i.stichtag, schritte: liste, offen: liste.filter((s) => !s.erledigt).length };
}
