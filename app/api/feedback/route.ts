/**
 * POST  /api/feedback { note, anlass, leistungId?, vorgang?: {id, code?} }  – Bewertung
 * PATCH /api/feedback { id, text }                                         – Freitext nachreichen
 * Mit Vorgang: höchstens eine Bewertung je Vorgang (der Vorgang merkt sich nur „bewertet“).
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { ergaenzeText, speichereFeedback } from "@/lib/feedback/service";
import { aktiv } from "@/lib/funktionen";
import { kontoFuer } from "@/lib/konto/vertretung";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { store } from "@/lib/storage/store";
import { ladeMitCode, ladeVorgang } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Schema = z.object({
  note: z.number().int().min(1).max(5),
  anlass: z.enum(["antrag", "erledigt", "termin", "allgemein"]),
  leistungId: z.string().max(80).optional(),
  vorgang: z.object({ id: z.string().max(40), code: z.string().max(64).optional() }).optional(),
});

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`feedback:${clientKey(req)}`, 20, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "feedback")) return fehler("nicht_verfuegbar", 404);
  const p = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  let leistungId = p.data.leistungId && tenant.leistungen.some((l) => l.id === p.data.leistungId) ? p.data.leistungId : undefined;
  let amtId: string | undefined;
  if (p.data.vorgang) {
    const konto = await kontoFuer(tenant, "antraege");
    const eigen = konto ? await ladeVorgang(tenant, p.data.vorgang.id) : undefined;
    const v = p.data.vorgang.code ? await ladeMitCode(tenant, p.data.vorgang.id, p.data.vorgang.code) : eigen?.kontoId === konto?.id ? eigen : undefined;
    if (!v) return fehler("nicht_gefunden", 404);
    if (v.bewertet) return fehler("schon_bewertet", 409);
    await store().put("vorgaenge", { ...v, bewertet: true });
    leistungId = v.leistungId;
    amtId = v.amtId;
  }
  const r = await speichereFeedback(tenant, { note: p.data.note as 1 | 2 | 3 | 4 | 5, anlass: p.data.anlass, leistungId, amtId });
  return Response.json({ ok: true, id: r.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`feedback-text:${clientKey(req)}`, 10, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  const p = z.object({ id: z.string().max(40), text: z.string().trim().min(2).max(1000) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  return (await ergaenzeText(tenant, p.data.id, p.data.text)) ? Response.json({ ok: true }) : fehler("nicht_gefunden", 404);
}
