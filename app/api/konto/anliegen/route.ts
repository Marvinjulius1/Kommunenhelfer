/** GET /api/konto/anliegen – alle Vorgänge und Termine des angemeldeten Kontos. */
import { tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { anliegenVon } from "@/lib/konto/service";
import { terminSicht, vorgangExtras, vorgangSicht } from "@/lib/vorgaenge/sicht";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const { vorgaenge, termine } = await anliegenVon(ctx.konto);
  const mitExtras = await Promise.all(vorgaenge.map(async (v) => ({ ...vorgangSicht(tenant, v), ...(await vorgangExtras(tenant, v)) })));
  const eintraege = [...mitExtras, ...termine.map((t) => terminSicht(tenant, t))].sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
  return Response.json({ eintraege }, { headers: { "Cache-Control": "no-store" } });
}
