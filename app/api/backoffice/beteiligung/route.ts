/**
 * POST  – Umfrage anlegen
 * PATCH – { typ: "umfrage", id, beenden: true } | { typ: "idee", id, status, antwort? }
 * Nur Rolle „redaktion“.
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { beendeUmfrage, legeUmfrageAn, moderiere } from "@/lib/beteiligung/service";

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
  const d = z
    .object({
      titel: z.string().trim().min(5).max(140),
      beschreibung: z.string().trim().max(2000).default(""),
      optionen: z.array(z.string().trim().min(1).max(120)).min(2).max(12),
      mehrfach: z.boolean().default(false),
      bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      ortsteil: z.string().max(60).optional(),
      ergebnisSofort: z.boolean().default(true),
      nurOnlineAusweis: z.boolean().default(false),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  const bis = new Date(d.data.bis + "T21:59:59Z");
  if (bis < new Date()) return fehler("ungueltige_anfrage");
  const u = await legeUmfrageAn(c.tenant, { ...d.data, ortsteil: d.data.ortsteil || undefined, bis: bis.toISOString(), autor: c.b.name });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "beteiligung", details: `Umfrage angelegt: ${u.titel}` });
  return Response.json({ id: u.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const c = await redaktion(req);
  if ("antwort" in c) return c.antwort;
  const d = z
    .union([
      z.object({ typ: z.literal("umfrage"), id: z.string().max(40), beenden: z.literal(true) }),
      z.object({ typ: z.literal("idee"), id: z.string().max(40), status: z.enum(["eingereicht", "veroeffentlicht", "abgelehnt", "in_pruefung", "umgesetzt"]), antwort: z.string().max(2000).optional() }),
    ])
    .safeParse(await leseJson(req).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  const ok = d.data.typ === "umfrage" ? await beendeUmfrage(c.tenant, d.data.id) : await moderiere(c.tenant, d.data.id, { status: d.data.status, antwort: d.data.antwort, benutzer: c.b.name });
  if (!ok) return fehler("nicht_gefunden", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "beteiligung", details: d.data.typ === "umfrage" ? `Umfrage beendet: ${d.data.id}` : `Idee ${d.data.id}: ${d.data.status}` });
  return Response.json({ ok: true });
}
