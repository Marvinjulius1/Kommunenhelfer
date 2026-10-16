/** Gemeinsamer Einstieg für Backoffice-Aktionen an einem Vorgang: Herkunft, Anmeldung, Berechtigung. */
import "server-only";
import { fehler, tenantAus } from "@/lib/api";
import { ladeVorgang } from "@/lib/vorgaenge/service";
import { aktuellerBenutzer, darfAmt, gleicheHerkunft } from "./auth";

export async function vorbereiten(req: Request, id: string) {
  if (!gleicheHerkunft(req)) return { antwort: fehler("herkunft", 403) };
  const tenant = await tenantAus(req);
  const b = await aktuellerBenutzer(tenant);
  if (!b) return { antwort: fehler("nicht_angemeldet", 401) };
  const v = await ladeVorgang(tenant, id);
  if (!v || !darfAmt(b, v.amtId)) return { antwort: fehler("nicht_gefunden", 404) };
  return { tenant, b, v };
}

