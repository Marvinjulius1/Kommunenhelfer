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
  /** Mit dem Formular-Baukasten erstellte Online-Anträge */
  eigeneLeistungen?: Leistung[];
  geaendertVon?: string;
}

// Prozessweit, damit ein Speichern den Cache aller Routen leert
const g = globalThis as { __anpassungsCache?: Map<string, { zeit: number; daten: AnpassungRecord | undefined }> };
const cache = (g.__anpassungsCache ??= new Map());

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
    // Geänderte Texte ersetzen nur die deutsche Fassung – Übersetzungen bleiben erhalten
    texte: Object.fromEntries(
      Object.entries({ ...basis.texte, ...(a.texte ?? {}) }).map(([k, v]) => {
        const alt = basis.texte[k as keyof typeof basis.texte];
        return [k, typeof v === "string" && alt && typeof alt === "object" ? { ...alt, de: v } : v];
      }),
    ) as GemeindeConfig["texte"],
    leistungen: [
      ...basis.leistungen.map((l) => (a.leistungen[l.id] ? { ...l, ...a.leistungen[l.id] } : l)),
      // Eigene Formulare dürfen keine Leistung der Konfigurationsdatei überschreiben
      ...(a.eigeneLeistungen ?? []).filter((e) => !basis.leistungen.some((l) => l.id === e.id)),
    ],
  };
}

export async function wendeAnpassungenAn(basis: GemeindeConfig): Promise<GemeindeConfig> {
  return anwenden(basis, await ladeAnpassungen(basis.slug));
}

export async function speichereAnpassungen(a: AnpassungRecord) {
  await store().put("anpassungen", a);
  cache.delete(a.tenant);
}
