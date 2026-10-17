/** POST { wahl: string[] } – an einer Umfrage teilnehmen (Bürgerkonto, eine Stimme pro Person) */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { ladeUmfrage, stimmeAb, umfrageSicht } from "@/lib/beteiligung/service";
import { aktiv } from "@/lib/funktionen";
import { mitKonto } from "@/lib/konto/api";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "beteiligung")) return fehler("nicht_verfuegbar", 404);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ wahl: z.array(z.string().max(10)).min(1).max(20) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const id = (await params).id;
  const r = await stimmeAb(tenant, id, ctx.konto, b.data.wahl);
  if (!r.ok) return fehler(r.fehler, r.fehler === "nicht_gefunden" ? 404 : r.fehler === "online_ausweis_noetig" ? 403 : 409);
  return Response.json(umfrageSicht((await ladeUmfrage(tenant, id))!, ctx.konto));
}
