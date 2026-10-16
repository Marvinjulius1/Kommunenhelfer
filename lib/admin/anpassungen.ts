/**
 * Anpassungen aus dem Admin-Bereich.
 * Gemeinden pflegen Leistungen (aktiv, Texte, Gebühren, Unterlagen) ohne
 * Entwickler. Gespeichert wird nur die Abweichung zur Konfigurationsdatei;
 * vor dem Speichern wird das Ergebnis vollständig validiert.
 */
import "server-only";
import type { GemeindeConfig, Leistung } from "@/config/types";
import type { StoredRecord } from "@/lib/storage/store";
import { store } from "@/lib/storage/store";

export type LeistungAnpassung = Partial<Pick<Leistung, "aktiv" | "kurz" | "beschreibung" | "unterlagen" | "gebuehren" | "ablauf" | "fristen">>;

export interface AnpassungRecord extends StoredRecord {
  leistungen: Record<string, LeistungAnpassung>;
  /** Zusätzliche Texte unter dem Wappen etc. */
  texte?: Partial<GemeindeConfig["texte"]>;
  geaendertVon?: string;
}

const cache = new Map<string, { zeit: number; daten: AnpassungRecord | undefined }>();

export async function ladeAnpassungen(tenant: string): Promise<AnpassungRecord | undefined> {
  const c = cache.get(tenant);
  if (c && Date.now() - c.zeit < 5_000) return c.daten;
  const daten = await store().get<AnpassungRecord>("anpassungen", tenant);
  cache.set(tenant, { zeit: Date.now(), daten });
  return daten;
}

export function anwenden(basis: GemeindeConfig, a: AnpassungRecord | undefined): GemeindeConfig {
  if (!a) return basis;
  return {
    ...basis,
    texte: { ...basis.texte, ...(a.texte ?? {}) },
    leistungen: basis.leistungen.map((l) => (a.leistungen[l.id] ? { ...l, ...a.leistungen[l.id] } : l)),
  };
}

export async function wendeAnpassungenAn(basis: GemeindeConfig): Promise<GemeindeConfig> {
  return anwenden(basis, await ladeAnpassungen(basis.slug));
}

export async function speichereAnpassungen(a: AnpassungRecord) {
  await store().put("anpassungen", a);
  cache.delete(a.tenant);
}
