/**
 * GET  ?amt=…                         – Warteliste des Tages
 * POST { amtId, schalter }            – nächste Nummer aufrufen
 * PATCH { amtId, id, status }         – erledigt / nicht erschienen
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { boZugang } from "@/lib/backoffice/zugang";
import { anzeigeNummer, rufeAuf, schliesseAb, stand, warteliste, wartendeAemter } from "@/lib/wartezeit/service";

export const runtime = "nodejs";

async function mitAmt(req: Request, amtId: string | null | undefined) {
  const tenant = await tenantAus(req);
  const amt = wartendeAemter(tenant).find((a) => a.id === amtId);
  if (!amt) return { antwort: fehler("ungueltige_anfrage") };
  const c = await boZugang(req, amt.id);
  return "antwort" in c ? c : { ...c, amt };
}

export async function GET(req: Request) {
  const c = await mitAmt(req, new URL(req.url).searchParams.get("amt"));
  if ("antwort" in c) return c.antwort;
  const liste = await warteliste(c.tenant, c.amt.id);
  return Response.json(
    {
      stand: await stand(c.tenant, c.amt),
      liste: liste.filter((w) => w.status === "wartend" || w.status === "aufgerufen").map((w) => ({ id: w.id, nummer: anzeigeNummer(c.amt, w.nummer), status: w.status, schalter: w.schalter, seit: w.erstelltAm, konto: !!w.kontoId })),
      erledigt: liste.filter((w) => w.status === "erledigt").length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const body = await leseJson(req).catch(() => null);
  const d = z.object({ amtId: z.string().max(60), schalter: z.string().trim().min(1).max(30) }).safeParse(body);
  if (!d.success) return fehler("ungueltige_anfrage");
  const c = await mitAmt(req, d.data.amtId);
  if ("antwort" in c) return c.antwort;
  const r = await rufeAuf(c.tenant, c.amt, d.data.schalter);
  if (!r) return fehler("niemand_wartet", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "wartenummer_aufgerufen", details: `${r.anzeige} → ${d.data.schalter}` });
  return Response.json({ nummer: r.anzeige, id: r.id });
}

export async function PATCH(req: Request) {
  const body = await leseJson(req).catch(() => null);
  const d = z.object({ amtId: z.string().max(60), id: z.string().max(40), status: z.enum(["erledigt", "nicht_erschienen"]) }).safeParse(body);
  if (!d.success) return fehler("ungueltige_anfrage");
  const c = await mitAmt(req, d.data.amtId);
  if ("antwort" in c) return c.antwort;
  if (!(await schliesseAb(c.tenant, d.data.id, d.data.status))) return fehler("nicht_gefunden", 404);
  return Response.json({ ok: true });
}
