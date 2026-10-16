/** POST: Fundsache erfassen · PATCH { id, status }: abgeholt / wieder offen */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { amtFuer, boZugang } from "@/lib/backoffice/zugang";
import { erfasseFund, FUND_KATEGORIEN, setzeFundStatus } from "@/lib/fundbuero/service";

export const runtime = "nodejs";

async function zugang(req: Request) {
  return boZugang(req, amtFuer(await tenantAus(req), "fundsache").id);
}

export async function POST(req: Request) {
  const c = await zugang(req);
  if ("antwort" in c) return c.antwort;
  const d = z
    .object({
      bezeichnung: z.string().trim().min(2).max(80),
      kategorie: z.enum(FUND_KATEGORIEN as [string, ...string[]]),
      beschreibung: z.string().trim().max(300).default(""),
      fundort: z.string().trim().min(2).max(120),
      funddatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      intern: z.string().trim().max(1000).optional(),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  const r = await erfasseFund(c.tenant, { ...d.data, benutzer: c.b.name });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "fund_erfasst", details: r.bezeichnung });
  return Response.json({ id: r.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const c = await zugang(req);
  if ("antwort" in c) return c.antwort;
  const d = z.object({ id: z.string().max(40), status: z.enum(["offen", "abgeholt"]) }).safeParse(await leseJson(req).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  if (!(await setzeFundStatus(c.tenant, d.data.id, d.data.status))) return fehler("nicht_gefunden", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "fund_geaendert", details: `${d.data.id}: ${d.data.status}` });
  return Response.json({ ok: true });
}
