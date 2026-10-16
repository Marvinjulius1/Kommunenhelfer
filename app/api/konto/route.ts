/** GET: angemeldetes Konto (Kurzinfo) · DELETE: Konto löschen (DSGVO Art. 17) */
import { tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { aktuellesKonto, loescheKonto, sicht } from "@/lib/konto/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const k = await aktuellesKonto(await tenantAus(req));
  return Response.json({ konto: k ? sicht(k) : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  await loescheKonto(ctx.konto);
  return Response.json({ ok: true });
}
