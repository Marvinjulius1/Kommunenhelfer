/**
 * Fachliche Prüfungen rund um Uploads – gemeinsam für Browser und Server.
 * Der Assistent sortiert vor; die Entscheidung trifft immer das Amt.
 */
import type { Amt, DokumentAnforderung, GemeindeConfig, Sprache } from "@/config/types";
import { tx } from "@/lib/i18n";
import { dokumentarten } from "./dokumentarten";

export function artLabel(tenant: Pick<GemeindeConfig, "dokumentarten">, art: string, lang: Sprache): string {
  return tx(dokumentarten(tenant).find((d) => d.id === art)?.label ?? art, lang);
}

/** Welche Pflicht-Unterlagen fehlen für eine Leistung? */
export function fehlendeUnterlagen(tenant: GemeindeConfig, leistungId: string | undefined, arten: string[]): DokumentAnforderung[] {
  const l = tenant.leistungen.find((x) => x.id === leistungId && x.aktiv);
  if (!l?.dokumente) return [];
  const vorhanden = new Set(arten);
  // Personalausweis und Reisepass gelten wechselseitig als Identitätsnachweis.
  if (vorhanden.has("reisepass")) vorhanden.add("personalausweis");
  if (vorhanden.has("personalausweis")) vorhanden.add("reisepass");
  return l.dokumente.filter((d) => d.pflicht && !vorhanden.has(d.art));
}

/** Zuständiges Amt: aus der Leistung, sonst Vorschlag, sonst Standard-Amt der Gemeinde. */
export function zustaendigesAmt(tenant: GemeindeConfig, leistungId?: string, vorschlag?: string): Amt {
  const l = tenant.leistungen.find((x) => x.id === leistungId && x.aktiv);
  const id = l?.amtId ?? vorschlag ?? tenant.uploads.standardAmtId;
  return tenant.aemter.find((a) => a.id === id) ?? tenant.aemter.find((a) => a.id === tenant.uploads.standardAmtId)!;
}

/** Leistungen, für die Unterlagen eingereicht werden können. */
export function einreichbareLeistungen(tenant: GemeindeConfig) {
  return tenant.leistungen.filter((l) => l.aktiv && (l.dokumente?.length || l.amtId));
}
