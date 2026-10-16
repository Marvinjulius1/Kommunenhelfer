/**
 * PATCH /api/backoffice/vorgang/[id]  { status }         – Status setzen
 * POST  /api/backoffice/vorgang/[id]  { rueckfrage }     – Rückfrage an den Bürger senden
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { aktuellerBenutzer, darfAmt, gleicheHerkunft } from "@/lib/backoffice/auth";
import { VORGANG_STATUS } from "@/lib/records";
import { fuegeNachrichtHinzu, ladeVorgang, setzeStatus } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

async function vorbereiten(req: Request, id: string) {
  if (!gleicheHerkunft(req)) return { antwort: fehler("herkunft", 403) };
  const tenant = await tenantAus(req);
  const b = await aktuellerBenutzer(tenant);
  if (!b) return { antwort: fehler("nicht_angemeldet", 401) };
  const v = await ladeVorgang(tenant, id);
  if (!v || !darfAmt(b, v.amtId)) return { antwort: fehler("nicht_gefunden", 404) };
  return { tenant, b, v };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await vorbereiten(req, (await params).id);
  if ("antwort" in ctx) return ctx.antwort;
  const parsed = z.object({ status: z.enum(VORGANG_STATUS as [string, ...string[]]) }).safeParse(await leseJson(req).catch(() => null));
  if (!parsed.success) return fehler("ungueltige_anfrage");
  const status = parsed.data.status as (typeof VORGANG_STATUS)[number];
  await setzeStatus(ctx.v, status, ctx.b.name);
  await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "status_geaendert", vorgangId: ctx.v.id, details: status });
  return Response.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await vorbereiten(req, (await params).id);
  if ("antwort" in ctx) return ctx.antwort;
  const parsed = z.object({ rueckfrage: z.string().trim().min(3).max(2000) }).safeParse(await leseJson(req).catch(() => null));
  if (!parsed.success) return fehler("ungueltige_anfrage");
  await fuegeNachrichtHinzu(ctx.tenant, ctx.v, { von: "amt", text: parsed.data.rueckfrage, benutzer: ctx.b.name });
  await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "rueckfrage_gesendet", vorgangId: ctx.v.id });
  return Response.json({ ok: true });
}
