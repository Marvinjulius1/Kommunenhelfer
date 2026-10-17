/**
 * Abwesenheit und Vertretung im Backoffice: Wer im Urlaub ist, benennt eine Vertretung.
 * Die Vertretung sieht die zugewiesenen Vorgänge unter „Mir zugewiesen“.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import type { VertretungRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";

const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

export async function vertretungen(tenant: GemeindeConfig) {
  return (await store().list<VertretungRecord>("vertretungen", (v) => v.tenant === tenant.slug)).sort((a, b) => a.von.localeCompare(b.von));
}

/** Heute gültige Vertretungen: abwesende Person → Vertretung */
export async function aktiveVertretungen(tenant: GemeindeConfig): Promise<Map<string, string>> {
  const t = heute();
  return new Map((await vertretungen(tenant)).filter((v) => v.von <= t && v.bis >= t).map((v) => [v.benutzer, v.vertreter]));
}

/** Für wen arbeitet diese Person heute mit? (eigener Name + alle, die sie vertritt) */
export async function zustaendigFuer(tenant: GemeindeConfig, name: string): Promise<string[]> {
  const m = await aktiveVertretungen(tenant);
  return [name, ...[...m.entries()].filter(([, vertreter]) => vertreter === name).map(([benutzer]) => benutzer)];
}

export async function setzeVertretung(tenant: GemeindeConfig, d: { benutzer: string; vertreter: string; von: string; bis: string }) {
  // Eine Abwesenheit je Person und Zeitraum: überlappende ersetzen
  for (const alt of await vertretungen(tenant)) if (alt.benutzer === d.benutzer && alt.von <= d.bis && alt.bis >= d.von) await store().delete("vertretungen", alt.id);
  const r: VertretungRecord = {
    id: randomBytes(8).toString("base64url"),
    tenant: tenant.slug,
    ...d,
    erstelltAm: new Date().toISOString(),
    loeschenAm: new Date(new Date(d.bis + "T23:59:59Z").getTime() + 30 * 86400_000).toISOString(),
  };
  await store().put("vertretungen", r);
  return r;
}

export async function entferneVertretung(tenant: GemeindeConfig, id: string, benutzer: string) {
  const v = await store().get<VertretungRecord>("vertretungen", id);
  if (!v || v.tenant !== tenant.slug || v.benutzer !== benutzer) return false;
  await store().delete("vertretungen", id);
  return true;
}
