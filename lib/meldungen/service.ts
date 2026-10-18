/** Meldungen der Verwaltung: kurz, öffentlich, optional für einen Ortsteil – mit Push an Abonnenten. */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { benachrichtige } from "@/lib/push/service";
import type { MeldungRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";

export async function aktuelleMeldungen(tenant: GemeindeConfig, ortsteil?: string): Promise<MeldungRecord[]> {
  const jetzt = new Date().toISOString();
  return (
    await store().list<MeldungRecord>("meldungen", (m) => m.tenant === tenant.slug && m.gueltigBis >= jetzt && (!ortsteil || !m.ortsteil || m.ortsteil === ortsteil))
  ).sort((a, b) => Number(b.wichtig) - Number(a.wichtig) || b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function alleMeldungen(tenant: GemeindeConfig) {
  return (await store().list<MeldungRecord>("meldungen", (m) => m.tenant === tenant.slug)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function veroeffentliche(
  tenant: GemeindeConfig,
  m: { titel: string; text: string; ortsteil?: string; gueltigBis: string; wichtig: boolean; autor: string; push: boolean; stufe?: MeldungRecord["stufe"]; kategorie?: MeldungRecord["kategorie"]; lat?: number; lng?: number },
) {
  const r: MeldungRecord = {
    id: randomBytes(9).toString("base64url"),
    tenant: tenant.slug,
    titel: m.titel,
    text: m.text,
    ortsteil: m.ortsteil,
    gueltigBis: m.gueltigBis,
    wichtig: m.wichtig,
    stufe: m.stufe,
    kategorie: m.kategorie,
    lat: m.lat,
    lng: m.lng,
    autor: m.autor,
    erstelltAm: new Date().toISOString(),
    // Abgelaufene Meldungen bleiben 30 Tage im Backoffice sichtbar
    loeschenAm: new Date(new Date(m.gueltigBis).getTime() + 30 * 86400_000).toISOString(),
  };
  await store().put("meldungen", r);
  const titel = m.stufe === "gefahr" ? `Warnung: ${m.titel}` : m.titel;
  const gesendet = m.push ? await benachrichtige(tenant, { thema: "meldungen", ortsteil: m.ortsteil, titel, text: m.text.slice(0, 140), url: "/aktuelles" }) : 0;
  return { meldung: r, gesendet };
}

export async function entferneMeldung(tenant: GemeindeConfig, id: string) {
  const m = await store().get<MeldungRecord>("meldungen", id);
  if (!m || m.tenant !== tenant.slug) return false;
  await store().delete("meldungen", id);
  return true;
}
