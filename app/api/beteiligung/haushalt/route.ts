/** POST { id, auswahl[] } – Stimme im Bürgerhaushalt (mit Bürgerkonto, eine Teilnahme). */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { waehle } from "@/lib/beteiligung/haushalt";
import { aktiv } from "@/lib/funktionen";
import { mitKonto } from "@/lib/konto/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "buergerhaushalt")) return fehler("nicht_verfuegbar", 404);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const p = z.object({ id: z.string().max(40), auswahl: z.array(z.string().max(10)).min(1).max(50) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const r = await waehle(tenant, p.data.id, ctx.konto, p.data.auswahl);
  return r === "ok" ? Response.json({ ok: true }) : fehler(r, r === "schon" ? 409 : 422);
}
