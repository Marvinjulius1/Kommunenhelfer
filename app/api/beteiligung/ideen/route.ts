/** POST { titel, text, kategorie, ortsteil? } – Idee einreichen (Bürgerkonto). Erscheint nach Prüfung. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { IDEE_KATEGORIEN, ideeSicht, reicheIdeeEin } from "@/lib/beteiligung/service";
import { aktiv } from "@/lib/funktionen";
import { mitKonto } from "@/lib/konto/api";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "beteiligung")) return fehler("nicht_verfuegbar", 404);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const rl = rateLimit(`idee:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const b = z
    .object({
      titel: z.string().trim().min(5).max(100),
      text: z.string().trim().min(20).max(2000),
      kategorie: z.enum(IDEE_KATEGORIEN as [string, ...string[]]),
      ortsteil: z.string().max(60).optional(),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  if (b.data.ortsteil && !tenant.ortsteile?.includes(b.data.ortsteil)) return fehler("ungueltige_anfrage");
  const r = await reicheIdeeEin(tenant, ctx.konto, b.data);
  if (!r.ok) return fehler(r.fehler, 429);
  return Response.json(ideeSicht(r.idee, ctx.konto), { status: 201 });
}
