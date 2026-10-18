/**
 * GET /api/konto/hinweise       – „Was steht bei mir an?“
 * PUT /api/konto/hinweise {id}  – Hinweis ausblenden (nur ausblendbare)
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { speichereKonto } from "@/lib/konto/service";
import { hinweiseFuer } from "@/lib/konto/uebersicht";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  return Response.json({ hinweise: await hinweiseFuer(tenant, ctx.konto) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const p = z.object({ id: z.string().min(3).max(160) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const h = (await hinweiseFuer(tenant, ctx.konto)).find((x) => x.id === p.data.id);
  if (!h || !h.ausblendbar) return fehler("nicht_gefunden", 404);
  // Begrenzt: ältere Einträge fallen heraus (sie beziehen sich auf vergangene Daten)
  await speichereKonto({ ...ctx.konto, ausgeblendet: [...(ctx.konto.ausgeblendet ?? []), h.id].slice(-100) });
  return Response.json({ ok: true });
}
