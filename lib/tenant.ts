/**
 * Mandanten-Auflösung auf dem Server.
 *
 * Reihenfolge:
 *  1. Header "x-tenant" (wird von middleware.ts aus der Subdomain gesetzt)
 *  2. Umgebungsvariable TENANT (Einzel-Build pro Gemeinde, z. B. für Capacitor)
 *  3. DEFAULT_TENANT
 */
import "server-only";
import { headers, cookies } from "next/headers";
import { tenants, DEFAULT_TENANT } from "@/tenants";
import type { GemeindeConfig, Leistung, Sprache } from "@/config/types";

export function getTenantBySlug(slug: string | null | undefined): GemeindeConfig {
  return (slug && tenants[slug]) || tenants[DEFAULT_TENANT] || Object.values(tenants)[0];
}

export async function getTenant(): Promise<GemeindeConfig> {
  const h = await headers();
  return mitAnpassungen(getTenantBySlug(h.get("x-tenant")));
}

/**
 * Wendet Änderungen aus dem Admin-Bereich (Leistungen, Texte, Wissen) auf die
 * Basis-Konfiguration an. Die Konfigurationsdatei bleibt die Grundlage.
 */
export async function mitAnpassungen(basis: GemeindeConfig): Promise<GemeindeConfig> {
  const { wendeAnpassungenAn } = await import("@/lib/admin/anpassungen");
  return wendeAnpassungenAn(basis);
}

export async function getLang(tenant: GemeindeConfig): Promise<Sprache> {
  const c = await cookies();
  const wanted = c.get("lang")?.value as Sprache | undefined;
  return wanted && tenant.sprachen.includes(wanted) ? wanted : tenant.standardSprache;
}

export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get("x-nonce") ?? undefined;
}

export function aktiveLeistungen(tenant: GemeindeConfig): Leistung[] {
  return tenant.leistungen.filter((l) => l.aktiv);
}

export function findeLeistung(tenant: GemeindeConfig, id: string): Leistung | undefined {
  return tenant.leistungen.find((l) => l.id === id && l.aktiv);
}
