/**
 * Fristüberwachung: Bearbeitungsfrist in Werktagen (Mo–Fr ohne Feiertage und
 * Schließtage der Gemeinde) ab Eingang. Gemeinsam für Backoffice, Cron und Bericht.
 */
import type { GemeindeConfig } from "@/config/types";
import { istFeiertag, plusTage } from "@/lib/feiertage";

export const STANDARD_BEARBEITUNG_TAGE = 10;

type V = { erstelltAm: string; leistungId?: string; amtId: string };

export function bearbeitungTage(tenant: GemeindeConfig, v: V): number {
  return tenant.leistungen.find((l) => l.id === v.leistungId)?.bearbeitungTage ?? tenant.aemter.find((a) => a.id === v.amtId)?.bearbeitungTage ?? STANDARD_BEARBEITUNG_TAGE;
}

function istWerktag(tenant: GemeindeConfig, d: string) {
  const wt = new Date(d + "T12:00:00Z").getUTCDay();
  return wt !== 0 && wt !== 6 && !istFeiertag(d) && !tenant.schliesstage.includes(d);
}

const berlin = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

/** Letzter Tag der Bearbeitungsfrist (ISO-Datum). */
export function werktageBis(tenant: GemeindeConfig, v: V): string {
  let d = berlin(v.erstelltAm);
  let rest = bearbeitungTage(tenant, v);
  while (rest > 0) {
    d = plusTage(d, 1);
    if (istWerktag(tenant, d)) rest--;
  }
  return d;
}

/** Werktage zwischen heute und dem Datum (negativ = überschritten). */
export function werktageZwischen(tenant: GemeindeConfig, heute: string, ziel: string): number {
  if (ziel === heute) return 0;
  const vor = ziel > heute;
  let n = 0;
  for (let d = heute; d !== ziel; ) {
    d = plusTage(d, vor ? 1 : -1);
    if (istWerktag(tenant, d)) n++;
  }
  return vor ? n : -n;
}

export interface Fristlage {
  frist: string;
  rest: number;
  ueberfaellig: boolean;
  bald: boolean;
  wiedervorlageFaellig: boolean;
}

export function fristlage(tenant: GemeindeConfig, v: V & { status: string; wiedervorlage?: { am: string } }, heute: string): Fristlage | undefined {
  if (v.status === "erledigt") return undefined;
  const frist = werktageBis(tenant, v);
  const rest = werktageZwischen(tenant, heute, frist);
  return { frist, rest, ueberfaellig: rest < 0, bald: rest >= 0 && rest <= 2, wiedervorlageFaellig: !!v.wiedervorlage && v.wiedervorlage.am <= heute };
}
