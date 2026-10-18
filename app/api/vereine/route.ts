/** POST – Nachricht an einen Verein. Dessen E-Mail-Adresse bleibt verborgen. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { schreibeVerein } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`verein:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const p = z.object({ vereinId: z.string().max(60), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), text: z.string().trim().min(5).max(1500), einwilligung: z.literal(true) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  try {
    await schreibeVerein(await tenantAus(req), p.data.vereinId, p.data);
  } catch {
    return fehler("nicht_gefunden", 404);
  }
  return Response.json({ ok: true });
}
