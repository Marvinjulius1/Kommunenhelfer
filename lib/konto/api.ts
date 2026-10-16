/** Hilfen für Konto-Routen. */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { fehler } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import type { KontoRecord } from "@/lib/records";
import { aktuellesKonto } from "./service";

/** Prüft Funktion, Herkunft (CSRF) und Anmeldung. */
export async function mitKonto(req: Request, tenant: GemeindeConfig): Promise<{ konto: KontoRecord } | { antwort: Response }> {
  if (!aktiv(tenant, "konto")) return { antwort: fehler("nicht_verfuegbar", 404) };
  if (req.method !== "GET" && !gleicheHerkunft(req)) return { antwort: fehler("herkunft", 403) };
  const konto = await aktuellesKonto(tenant);
  if (!konto) return { antwort: fehler("nicht_angemeldet", 401) };
  return { konto };
}
