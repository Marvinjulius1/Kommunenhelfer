/** GET: Checklisten des Kontos · POST { lebenslageId, stichtag }: neue Checkliste */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { aktiv } from "@/lib/funktionen";
import { mitKonto } from "@/lib/konto/api";
import { checklistenVon, checklisteSicht, inhalt, lebenslage, MAX_CHECKLISTEN, speichereCheckliste } from "@/lib/lebenslagen/service";

export const runtime = "nodejs";

const Datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d + "T00:00:00Z")));

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const liste = (await checklistenVon(ctx.konto)).map((c) => checklisteSicht(tenant, c)).filter(Boolean);
  return Response.json({ checklisten: liste }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "lebenslagen")) return fehler("nicht_verfuegbar", 404);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ lebenslageId: z.string().max(60), stichtag: Datum }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success || !lebenslage(tenant, b.data.lebenslageId)) return fehler("ungueltige_anfrage");
  const vorhanden = await checklistenVon(ctx.konto);
  const gleich = vorhanden.find((c) => inhalt(c).lebenslageId === b.data.lebenslageId);
  if (gleich) return Response.json(checklisteSicht(tenant, gleich));
  if (vorhanden.length >= MAX_CHECKLISTEN) return fehler("zu_viele", 422);
  const r = await speichereCheckliste(ctx.konto, { lebenslageId: b.data.lebenslageId, stichtag: b.data.stichtag, erledigt: [], erinnert: [] });
  return Response.json(checklisteSicht(tenant, r), { status: 201 });
}
