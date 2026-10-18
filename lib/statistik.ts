/**
 * Datenschutzfreundliche Nutzungsstatistik für die Gemeinde.
 * Es werden ausschließlich Tageszähler gespeichert – keine IP-Adressen,
 * keine Eingaben, keine Personenbezüge, keine Cookies.
 */
import "server-only";
import type { StoredRecord } from "@/lib/storage/store";
import { inTagen, store } from "@/lib/storage/store";

export type Zaehler =
  | "assistent_anfragen"
  | "assistent_beantwortet"
  | "assistent_weissnicht"
  | "vorgaenge"
  | "uploads"
  | "termine"
  | "zahlungen"
  | "zahlungen_cent"
  | "bescheide_digital"
  | "maengel"
  | "konten_neu"
  | "push_gesendet"
  | "wartemarken"
  | "erledigt"
  | "erledigt_stunden"
  | "frist_eingehalten"
  | "bewertungen"
  | "bewertung_summe"
  | "kurznachrichten"
  | "entwuerfe";

export interface StatistikTag extends StoredRecord {
  datum: string;
  zaehler: Partial<Record<Zaehler, number>>;
  /** Anliegen je Leistung (Assistent + Vorgänge) */
  leistungen: Record<string, number>;
}

// Prozessweit (globalThis): Next.js bündelt Routen getrennt, ein Modul-Zustand gäbe es sonst mehrfach.
const g = globalThis as { __statistikKette?: Promise<unknown> };

export function zaehle(tenant: string, z: Zaehler, n = 1, leistungId?: string): Promise<void> {
  const p = (g.__statistikKette ?? Promise.resolve()).then(async () => {
    const datum = new Date().toISOString().slice(0, 10);
    const id = `${tenant}:${datum}`;
    const alt = await store().get<StatistikTag>("statistik", id);
    const tag: StatistikTag = alt ?? { id, tenant, datum, zaehler: {}, leistungen: {}, erstelltAm: new Date().toISOString(), loeschenAm: inTagen(800) };
    tag.zaehler[z] = (tag.zaehler[z] ?? 0) + n;
    if (leistungId) tag.leistungen[leistungId] = (tag.leistungen[leistungId] ?? 0) + 1;
    await store().put("statistik", tag);
  });
  g.__statistikKette = p.catch(() => undefined);
  return p.catch(() => undefined) as Promise<void>;
}

export async function statistik(tenant: string, tage: number): Promise<StatistikTag[]> {
  const ab = new Date(Date.now() - tage * 86400_000).toISOString().slice(0, 10);
  return (await store().list<StatistikTag>("statistik", (s) => s.tenant === tenant && s.datum >= ab)).sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Tageszähler im Zeitraum [von, bis] (ISO-Datum, inklusive). */
export async function statistikZeitraum(tenant: string, von: string, bis: string): Promise<StatistikTag[]> {
  return (await store().list<StatistikTag>("statistik", (s) => s.tenant === tenant && s.datum >= von && s.datum <= bis)).sort((a, b) => a.datum.localeCompare(b.datum));
}
