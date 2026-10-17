/** POST { an } – Idee unterstützen bzw. Unterstützung zurückziehen */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { ideeSicht, unterstuetze } from "@/lib/beteiligung/service";
import { aktiv } from "@/lib/funktionen";
import { mitKonto } from "@/lib/konto/api";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "beteiligung")) return fehler("nicht_verfuegbar", 404);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ an: z.boolean() }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const i = await unterstuetze(tenant, (await params).id, ctx.konto, b.data.an);
  if (!i) return fehler("nicht_gefunden", 404);
  return Response.json(ideeSicht(i, ctx.konto));
}
