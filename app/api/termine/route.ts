/**
 * POST   /api/termine  – Termin buchen
 * DELETE /api/termine  – Termin absagen (mit Zugangscode)
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { buche, storniere } from "@/lib/booking/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { aktuellesKonto } from "@/lib/konto/service";

export const runtime = "nodejs";

const Buchen = z.object({
  amtId: z.string().max(60),
  leistungId: z.string().max(80).optional(),
  slot: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  hinweis: z.string().trim().max(300).optional(),
  video: z.boolean().optional(),
  einwilligung: z.literal(true),
});

export async function POST(req: Request) {
  const rl = rateLimit(`termin:${clientKey(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Buchen>;
  try {
    body = Buchen.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const tenant = await tenantAus(req);
  const konto = await aktuellesKonto(tenant);
  const r = await buche(tenant, { ...body, kontoId: konto?.id });
  if ("fehler" in r) return fehler(r.fehler!, r.fehler === "slot_vergeben" ? 409 : 404);
  return Response.json(r, { status: 201 });
}

const Absagen = z.object({ id: z.string().max(40), code: z.string().max(64).optional() });

export async function DELETE(req: Request) {
  const rl = rateLimit(`termin-del:${clientKey(req)}`, 10, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Absagen>;
  try {
    body = Absagen.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const tenant = await tenantAus(req);
  const konto = body.code ? undefined : await aktuellesKonto(tenant);
  const ok = await storniere(tenant, body.id, body.code, konto?.id);
  return ok ? Response.json({ ok: true }) : fehler("nicht_gefunden", 404);
}
