/** POST { id, code } – Abmeldung per Link aus der Bestätigungs-E-Mail. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { ladeAnmeldung, storniere } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`abmelden:${clientKey(req)}`, 20, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const p = z.object({ id: z.string().max(40), code: z.string().max(64) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const tenant = await tenantAus(req);
  const a = await ladeAnmeldung(tenant, p.data.id, p.data.code);
  if (!a) return fehler("nicht_gefunden", 404);
  if (a.status !== "storniert") await storniere(tenant, a);
  return Response.json({ ok: true });
}
