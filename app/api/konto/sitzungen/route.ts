import { tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { sitzungenVon } from "@/lib/konto/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  return Response.json({ sitzungen: await sitzungenVon(ctx.konto) }, { headers: { "Cache-Control": "no-store" } });
}
