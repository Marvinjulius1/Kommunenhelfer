/** Gemeinsame Helfer für API-Routen. */
import "server-only";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { getTenantBySlug, mitAnpassungen } from "@/lib/tenant";

/** Mandant aus dem von der Middleware gesetzten Header (inkl. Änderungen aus dem Admin-Bereich). */
export async function tenantAus(req: Request): Promise<GemeindeConfig> {
  return mitAnpassungen(getTenantBySlug(req.headers.get("x-tenant")));
}

export function langAus(req: Request, tenant: GemeindeConfig, wunsch?: unknown): Sprache {
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)lang=(\w+)/)?.[1];
  const l = (typeof wunsch === "string" ? wunsch : cookie) as Sprache | undefined;
  return l && tenant.sprachen.includes(l) ? l : tenant.standardSprache;
}

/** Liest JSON mit Größenbegrenzung (Schutz vor übergroßen Anfragen). */
export async function leseJson(req: Request, maxBytes = 32_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("zu_gross");
  return JSON.parse(text);
}

export function fehler(code: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ fehler: code, ...extra }, { status });
}

/**
 * Öffentliche Basis-URL für Links in E-Mails und Webhooks.
 * PORTAL_URL (z. B. "https://{gemeinde}.meinportal.de") hat Vorrang – so lassen
 * sich Links nicht über einen manipulierten Host-Header umlenken.
 */
export function basisUrl(req: Request, tenant: GemeindeConfig): string {
  if (process.env.PORTAL_URL) return process.env.PORTAL_URL.replace("{gemeinde}", tenant.slug).replace(/\/$/, "");
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return `${proto}://${host}`;
}
