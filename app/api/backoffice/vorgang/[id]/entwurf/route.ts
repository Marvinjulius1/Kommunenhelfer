/**
 * POST /api/backoffice/vorgang/[id]/entwurf { art } – Entwurf für Rückfrage, Bescheid-Text oder Antwort.
 * Liefert nur einen Vorschlag zurück; gespeichert oder gesendet wird nichts.
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { erstelleEntwurf } from "@/lib/backoffice/entwurf";
import { vorbereiten } from "@/lib/backoffice/vorgang";
import { decryptJson } from "@/lib/crypto";
import { tx } from "@/lib/i18n";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import type { VorgangDaten } from "@/lib/records";
import { zaehle } from "@/lib/statistik";
import { nachrichten } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await vorbereiten(req, (await params).id);
  if ("antwort" in ctx) return ctx.antwort;
  const rl = rateLimit(`entwurf:${ctx.b.name}:${clientKey(req)}`, 30, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const p = z.object({ art: z.enum(["rueckfrage", "bescheid", "antwort"]) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const amt = ctx.tenant.aemter.find((a) => a.id === ctx.v.amtId);
  const e = await erstelleEntwurf(ctx.tenant, ctx.v, decryptJson<VorgangDaten>(ctx.v.daten), nachrichten(ctx.v), p.data.art, amt ? tx(amt.name, "de") : ctx.tenant.name);
  await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "entwurf_erstellt", vorgangId: ctx.v.id, details: `${p.data.art} (${e.quelle})` });
  await zaehle(ctx.tenant.slug, "entwuerfe");
  return Response.json(e, { headers: { "Cache-Control": "no-store" } });
}
