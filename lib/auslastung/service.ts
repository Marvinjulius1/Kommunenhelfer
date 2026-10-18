/**
 * Tageszähler je Amt (Termine, Wartenummern) für die Auslastungsprognose.
 * Termine und Wartenummern selbst werden nach kurzer Zeit gelöscht – die Zähler
 * enthalten nur Anzahlen, keine Personendaten, und bleiben ein gutes Jahr.
 */
import "server-only";
import type { Amt, GemeindeConfig } from "@/config/types";
import { addTage, heuteBerlin, wochentag } from "@/lib/booking/slots";
import { demoModus } from "@/lib/demo";
import type { TerminRecord, WarteRecord } from "@/lib/records";
import type { StoredRecord } from "@/lib/storage/store";
import { inTagen, store } from "@/lib/storage/store";
import { kapazitaet, type TagWert } from "./prognose";

interface AuslastungRecord extends StoredRecord, TagWert {
  amtId: string;
}

/** Zählt die letzten Tage aus den (noch vorhandenen) Terminen und Wartenummern. Idempotent. */
export async function sichereAuslastung(tenant: GemeindeConfig, jetzt = new Date()) {
  const heute = heuteBerlin(jetzt);
  let n = 0;
  for (const amt of tenant.aemter) {
    for (const datum of [addTage(heute, -1), addTage(heute, -2)]) {
      const termine = (await store().list<TerminRecord>("termine", (t) => t.tenant === tenant.slug && t.amtId === amt.id && t.status === "gebucht" && t.slot.startsWith(datum))).length;
      const wartenummern = (await store().list<WarteRecord>("wartenummern", (w) => w.tenant === tenant.slug && w.amtId === amt.id && w.datum === datum && w.status !== "storniert")).length;
      const id = `${tenant.slug}:${amt.id}:${datum}`;
      const alt = await store().get<AuslastungRecord>("auslastung", id);
      // Nur überschreiben, wenn es etwas zu zählen gibt (Wartenummern sind nach 2 Tagen gelöscht)
      if (!termine && !wartenummern && alt) continue;
      await store().put<AuslastungRecord>("auslastung", { id, tenant: tenant.slug, amtId: amt.id, datum, termine: Math.max(termine, alt?.termine ?? 0), wartenummern: Math.max(wartenummern, alt?.wartenummern ?? 0), erstelltAm: new Date().toISOString(), loeschenAm: inTagen(400) });
      n++;
    }
  }
  return n;
}

export async function historie(tenant: GemeindeConfig, amt: Amt): Promise<{ werte: TagWert[]; beispiel: boolean }> {
  const werte = await store().list<AuslastungRecord>("auslastung", (a) => a.tenant === tenant.slug && a.amtId === amt.id);
  if (werte.length >= 10 || !demoModus()) return { werte, beispiel: false };
  // Vorführung ohne Verlauf: deutlich gekennzeichneter Beispielverlauf (Montag/Donnerstag stark)
  const heute = heuteBerlin();
  // Auslastung je Wochentag relativ zur eigenen Kapazität des Amts
  const muster: Record<string, number> = { mo: 1.1, di: 0.75, mi: 0.6, do: 1.05, fr: 0.5 };
  const beispiel = Array.from({ length: 56 }, (_, i) => addTage(heute, -i - 1)).map((datum) => {
    const f = muster[wochentag(datum)] ?? 0;
    const p = kapazitaet(tenant, amt, datum).plaetze;
    return { datum, termine: Math.round(p * 0.75 * f), wartenummern: Math.round(p * 0.25 * f) };
  });
  return { werte: beispiel, beispiel: true };
}

export async function gebuchtProTag(tenant: GemeindeConfig, amt: Amt) {
  const m = new Map<string, number>();
  for (const t of await store().list<TerminRecord>("termine", (x) => x.tenant === tenant.slug && x.amtId === amt.id && x.status === "gebucht")) m.set(t.slot.slice(0, 10), (m.get(t.slot.slice(0, 10)) ?? 0) + 1);
  return m;
}
