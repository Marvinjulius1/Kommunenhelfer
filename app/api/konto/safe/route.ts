/** GET: Dokumentensafe auflisten · POST: Datei ablegen (Rohdaten, Name im Header x-dateiname) */
import { fehler, tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { legeInSafe, safeSicht, safeVon } from "@/lib/safe/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  return Response.json({ dokumente: (await safeVon(ctx.konto)).map(safeSicht) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const rl = rateLimit(`safe:${clientKey(req)}`, 30, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const max = tenant.uploads.maxDateiMB * 1024 * 1024;
  if (Number(req.headers.get("content-length") ?? 0) > max) return fehler("zu_gross", 413);
  const daten = Buffer.from(await req.arrayBuffer());
  let name = "Dokument";
  try {
    name = decodeURIComponent(req.headers.get("x-dateiname") ?? "Dokument").slice(0, 200);
  } catch {}
  const r = await legeInSafe(tenant, ctx.konto, name, daten);
  if (!r.ok) return fehler(r.fehler, r.fehler === "scanner" ? 503 : 422);
  return Response.json(safeSicht(r.record), { status: 201 });
}
