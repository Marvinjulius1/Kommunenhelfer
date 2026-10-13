/** Gemeinsame Helfer für API-Routen. */
import "server-only";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { getTenantBySlug } from "@/lib/tenant";

/** Mandant aus dem von der Middleware gesetzten Header. */
export function tenantAus(req: Request): GemeindeConfig {
  return getTenantBySlug(req.headers.get("x-tenant"));
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
