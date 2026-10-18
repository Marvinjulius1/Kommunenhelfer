/**
 * Kita-Platz-Börse: Eltern geben bis zu drei Wunsch-Kitas an und sehen ihren
 * Platz auf der Warteliste. Die Kita (Backoffice) bietet Plätze an; Eltern
 * nehmen an oder lehnen ab. Daten des Kindes nur verschlüsselt.
 *
 * Rangfolge: Reihenfolge des Eingangs je Kita und Altersgruppe. Kommunale
 * Vergabekriterien (z. B. Geschwisterkinder) entscheidet weiterhin die Kita –
 * die Liste ist eine Orientierung, kein Bescheid.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig, Kita } from "@/config/types";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { stelleZu } from "@/lib/postfach/service";
import type { KitaStatus, KitaWunschRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

export const MAX_WUENSCHE = 3;
export const ANGEBOT_TAGE = 14;
export const GRUPPE_LABEL: Record<KitaWunschRecord["altersgruppe"], string> = { u3: "unter 3 Jahren (Krippe)", ue3: "ab 3 Jahren (Kindergarten)", hort: "Schulkind (Hort)" };

export interface KindDaten {
  vorname: string;
  geburtsdatum: string;
  stunden: number;
  hinweis?: string;
}

/** Altersgruppe zum gewünschten Beginn (Stichtag: 1. des Monats). */
export function altersgruppe(geburtsdatum: string, beginn: string): KitaWunschRecord["altersgruppe"] {
  const [gj, gm, gt] = geburtsdatum.split("-").map(Number);
  const [bj, bm] = beginn.split("-").map(Number);
  let jahre = bj - gj - (bm < gm || (bm === gm && 1 < gt) ? 1 : 0);
  if (jahre < 0) jahre = 0;
  return jahre < 3 ? "u3" : jahre < 6 ? "ue3" : "hort";
}

export function kindVon(w: KitaWunschRecord): KindDaten {
  return decryptJson<KindDaten>(w.inhalt);
}

const aktivFuer = (w: KitaWunschRecord, kitaId: string) => w.status[kitaId] === "wartend" || w.status[kitaId] === "angebot";

/** Platz auf der Warteliste einer Kita (1 = vorne) */
export function rang(alle: KitaWunschRecord[], w: KitaWunschRecord, kitaId: string): number | undefined {
  if (!aktivFuer(w, kitaId)) return undefined;
  const liste = alle.filter((x) => x.altersgruppe === w.altersgruppe && aktivFuer(x, kitaId)).sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm) || a.id.localeCompare(b.id));
  return liste.findIndex((x) => x.id === w.id) + 1;
}

export async function alleWuensche(tenant: GemeindeConfig) {
  return store().list<KitaWunschRecord>("kitawuensche", (w) => w.tenant === tenant.slug);
}

export async function wuenscheVon(tenant: GemeindeConfig, kontoId: string) {
  return (await alleWuensche(tenant)).filter((w) => w.kontoId === kontoId).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function meldeBedarf(tenant: GemeindeConfig, kontoId: string, kind: KindDaten, beginn: string, kitas: string[]) {
  const gruppe = altersgruppe(kind.geburtsdatum, beginn);
  const gueltig = kitas.filter((id, i) => kitas.indexOf(id) === i && (tenant.kitas ?? []).some((k) => k.id === id && k.altersgruppen.includes(gruppe))).slice(0, MAX_WUENSCHE);
  if (!gueltig.length) throw new Error("keine_passende_kita");
  const r: KitaWunschRecord = {
    id: randomBytes(10).toString("base64url"),
    tenant: tenant.slug,
    kontoId,
    altersgruppe: gruppe,
    beginn,
    kitas: gueltig,
    status: Object.fromEntries(gueltig.map((k) => [k, "wartend" as KitaStatus])),
    inhalt: encryptJson(kind),
    erstelltAm: new Date().toISOString(),
    // Ein Jahr nach dem gewünschten Beginn wird der Wunsch gelöscht
    loeschenAm: new Date(Date.parse(beginn + "-01T00:00:00Z") + 365 * 86400_000).toISOString(),
  };
  await store().put("kitawuensche", r);
  return r;
}

export async function ladeWunsch(tenant: GemeindeConfig, id: string) {
  const w = await store().get<KitaWunschRecord>("kitawuensche", id);
  return w && w.tenant === tenant.slug ? w : undefined;
}

/** Kita bietet einen Platz an – Eltern haben 14 Tage Zeit. */
export async function bieteAn(tenant: GemeindeConfig, w: KitaWunschRecord, kita: Kita, absender: string) {
  if (w.status[kita.id] !== "wartend" || w.angebot) throw new Error("nicht_moeglich");
  const bis = inTagen(ANGEBOT_TAGE).slice(0, 10);
  const neu: KitaWunschRecord = { ...w, status: { ...w.status, [kita.id]: "angebot" }, angebot: { kitaId: kita.id, bis } };
  await store().put("kitawuensche", neu);
  const kind = kindVon(w);
  await stelleZu({
    tenant,
    art: "nachricht",
    kontoId: w.kontoId,
    titel: `Platzangebot: ${kita.name}`,
    text: `Gute Nachrichten: Die ${kita.name} bietet ${kind.vorname || "Ihrem Kind"} einen Platz ab ${new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(w.beginn + "-01T12:00:00Z"))} an.\n\nBitte sagen Sie bis zum ${new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(bis + "T12:00:00Z"))} unter „Kita-Platz“ zu oder ab. Danach geht der Platz an die nächste Familie.`,
    absender,
    tage: 120,
  });
  return neu;
}

export async function absagenDurchKita(w: KitaWunschRecord, kitaId: string) {
  const neu: KitaWunschRecord = { ...w, status: { ...w.status, [kitaId]: "abgesagt" }, angebot: w.angebot?.kitaId === kitaId ? undefined : w.angebot };
  await store().put("kitawuensche", neu);
  return neu;
}

/** Eltern nehmen das Angebot an (alle anderen Wünsche werden zurückgezogen) oder lehnen ab. */
export async function antworte(w: KitaWunschRecord, annehmen: boolean) {
  if (!w.angebot) throw new Error("kein_angebot");
  const k = w.angebot.kitaId;
  const status: KitaWunschRecord["status"] = annehmen
    ? Object.fromEntries(Object.keys(w.status).map((id) => [id, id === k ? "zugesagt" : w.status[id] === "abgesagt" ? "abgesagt" : "zurueckgezogen"]))
    : { ...w.status, [k]: "zurueckgezogen" };
  const neu: KitaWunschRecord = { ...w, status, angebot: undefined };
  await store().put("kitawuensche", neu);
  return neu;
}

/** Abgelaufene Angebote gehen zurück an die Kita (täglich). */
export async function laufeAngeboteAb(tenant: GemeindeConfig, heute: string) {
  let n = 0;
  for (const w of await alleWuensche(tenant))
    if (w.angebot && w.angebot.bis < heute) {
      await store().put("kitawuensche", { ...w, status: { ...w.status, [w.angebot.kitaId]: "zurueckgezogen" }, angebot: undefined });
      n++;
    }
  return n;
}

export async function zieheZurueck(w: KitaWunschRecord) {
  await store().put("kitawuensche", { ...w, status: Object.fromEntries(Object.entries(w.status).map(([id, s]) => [id, s === "zugesagt" || s === "abgesagt" ? s : "zurueckgezogen"])), angebot: undefined });
}
