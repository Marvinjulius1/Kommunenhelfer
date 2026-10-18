/**
 * PATCH /api/backoffice/vorgang/[id]  { status }         – Status setzen
 * PATCH /api/backoffice/vorgang/[id]  { wiedervorlage }  – Wiedervorlage setzen ({am, notiz} oder null)
 * POST  /api/backoffice/vorgang/[id]  { rueckfrage }     – Rückfrage an den Bürger senden
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { benutzerListe } from "@/lib/backoffice/auth";
import { store } from "@/lib/storage/store";
import { encryptJson } from "@/lib/crypto";
import { VORGANG_STATUS } from "@/lib/records";
import { fuegeNachrichtHinzu, setzeStatus } from "@/lib/vorgaenge/service";
import { vorbereiten } from "@/lib/backoffice/vorgang";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await vorbereiten(req, (await params).id);
  if ("antwort" in ctx) return ctx.antwort;
  const parsed = z
    .object({
      status: z.enum(VORGANG_STATUS as [string, ...string[]]).optional(),
      zugewiesen: z.string().max(60).nullable().optional(),
      wiedervorlage: z.object({ am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notiz: z.string().trim().max(500).optional() }).nullable().optional(),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!parsed.success) return fehler("ungueltige_anfrage");
  if (parsed.data.zugewiesen !== undefined) {
    const name = parsed.data.zugewiesen;
    if (name && !benutzerListe().some((b) => b.name === name)) return fehler("benutzer_unbekannt");
    await store().put("vorgaenge", { ...ctx.v, zugewiesen: name ?? undefined });
    await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "zugewiesen", vorgangId: ctx.v.id, details: name ?? "–" });
    return Response.json({ ok: true });
  }
  if (parsed.data.wiedervorlage !== undefined) {
    const w = parsed.data.wiedervorlage;
    await store().put("vorgaenge", { ...ctx.v, wiedervorlage: w ? { am: w.am, notiz: w.notiz ? encryptJson(w.notiz) : undefined, benutzer: ctx.b.name } : undefined });
    await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "wiedervorlage", vorgangId: ctx.v.id, details: w?.am ?? "entfernt" });
    return Response.json({ ok: true });
  }
  if (!parsed.data.status) return fehler("ungueltige_anfrage");
  const status = parsed.data.status as (typeof VORGANG_STATUS)[number];
  await setzeStatus(ctx.v, status, ctx.b.name, ctx.tenant);
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
