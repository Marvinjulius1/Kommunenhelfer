/**
 * Mandanten-Register (Multi-Tenant).
 *
 * Jede Gemeinde wird hier EINMAL eingetragen. Der Schlüssel entspricht
 * dem Ordnernamen unter tenants/ und der Subdomain
 * (z. B. musterstadt.meinportal.de → "musterstadt").
 *
 * Beim Laden wird jede Konfiguration geprüft. Fehler brechen Build und
 * Serverstart mit einer verständlichen Meldung ab.
 */
import type { GemeindeConfig } from "@/config/types";
import { pruefeGemeinde } from "@/config/schema";
import musterstadt from "./musterstadt/gemeinde.config";
import beispielhausen from "./beispielhausen/gemeinde.config";
import musterkreis from "./musterkreis/gemeinde.config";

const register: Record<string, GemeindeConfig> = {
  musterstadt,
  beispielhausen,
  musterkreis,
};

const fehler = Object.entries(register).flatMap(([slug, cfg]) => [
  ...(cfg.slug !== slug ? [`[${slug}] slug "${cfg.slug}" muss dem Schlüssel im Register entsprechen`] : []),
  ...pruefeGemeinde(cfg).map((f) => `[${slug}] ${f}`),
  // Landkreis-Verweise auf Mandanten in diesem Register müssen stimmen
  ...(cfg.landkreis && register[cfg.landkreis.slug] && register[cfg.landkreis.slug].art !== "Landkreis" ? [`[${slug}] landkreis: "${cfg.landkreis.slug}" ist kein Landkreis`] : []),
]);
if (fehler.length) {
  throw new Error(`Ungültige Gemeinde-Konfiguration:\n  - ${fehler.join("\n  - ")}\n\nSiehe README → "Neue Gemeinde in 30 Minuten einrichten".`);
}

export const tenants = register;

/** Gemeinde, die verwendet wird, wenn keine Subdomain erkannt wird. */
export const DEFAULT_TENANT = process.env.TENANT || process.env.NEXT_PUBLIC_DEFAULT_TENANT || "musterstadt";
