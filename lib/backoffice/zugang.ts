/** Gemeinsamer Einstieg für Backoffice-Aktionen ohne Vorgangsbezug: Herkunft, Anmeldung, Amt. */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { fehler, tenantAus } from "@/lib/api";
import { aktuellerBenutzer, darfAmt, gleicheHerkunft, type BoBenutzer } from "./auth";

export async function boZugang(req: Request, amtId?: string): Promise<{ tenant: GemeindeConfig; b: BoBenutzer } | { antwort: Response }> {
  if (req.method !== "GET" && !gleicheHerkunft(req)) return { antwort: fehler("herkunft", 403) };
  const tenant = await tenantAus(req);
  const b = await aktuellerBenutzer(tenant);
  if (!b) return { antwort: fehler("nicht_angemeldet", 401) };
  if (amtId && !darfAmt(b, amtId)) return { antwort: fehler("keine_berechtigung", 403) };
  return { tenant, b };
}

/** Amt, das für eine Zuständigkeit (z. B. "fundsache", "personalausweis") eingetragen ist. */
export function amtFuer(tenant: GemeindeConfig, zustaendigkeit: string) {
  return tenant.aemter.find((a) => a.zustaendigkeiten?.includes(zustaendigkeit)) ?? tenant.aemter.find((a) => a.id === tenant.uploads.standardAmtId)!;
}
