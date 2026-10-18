/**
 * POST  – Bürgerhaushalt anlegen  · PATCH { id, beenden: true }
 * Rolle „redaktion“.
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { beendeHaushalt, legeHaushaltAn } from "@/lib/beteiligung/haushalt";

export const runtime = "nodejs";

async function redaktion(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c;
  if (!hatRolle(c.b, "redaktion")) return { antwort: fehler("keine_berechtigung", 403) };
  return c;
}

export async function POST(req: Request) {
  const c = await redaktion(req);
  if ("antwort" in c) return c.antwort;
  const p = z
    .object({
      titel: z.string().trim().min(5).max(140),
      text: z.string().trim().max(2000).default(""),
      budgetEuro: z.number().int().min(100).max(100_000_000),
      bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      nurOnlineAusweis: z.boolean().default(false),
      projekte: z.array(z.object({ titel: z.string().trim().min(3).max(120), text: z.string().trim().max(600).default(""), kostenEuro: z.number().int().min(1), ortsteil: z.string().max(60).optional() })).min(2).max(40),
    })
    .safeParse(await leseJson(req, 64_000).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const bis = new Date(p.data.bis + "T21:59:59Z");
  if (bis < new Date()) return fehler("ungueltige_anfrage");
  if (p.data.projekte.some((x) => x.kostenEuro > p.data.budgetEuro)) return fehler("projekt_teurer_als_budget", 422);
  const h = await legeHaushaltAn(c.tenant, { ...p.data, bis: bis.toISOString(), autor: c.b.name });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "buergerhaushalt", details: `angelegt: ${h.titel}` });
  return Response.json({ ok: true, id: h.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const c = await redaktion(req);
  if ("antwort" in c) return c.antwort;
  const p = z.object({ id: z.string().max(40), beenden: z.literal(true) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success || !(await beendeHaushalt(c.tenant, p.data.id))) return fehler("nicht_gefunden", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "buergerhaushalt", details: `beendet: ${p.data.id}` });
  return Response.json({ ok: true });
}
