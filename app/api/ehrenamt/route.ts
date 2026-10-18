/** POST – „Ich helfe mit“: Nachricht an die suchende Organisation. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { meldeInteresse } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`ehrenamt:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "ehrenamt")) return fehler("nicht_verfuegbar", 404);
  const p = z
    .object({ ehrenamtId: z.string().max(80), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), telefon: z.string().trim().max(40).optional(), text: z.string().trim().min(5).max(1500), einwilligung: z.literal(true) })
    .safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  try {
    const { ehrenamtId, name, email, telefon, text } = p.data;
    await meldeInteresse(tenant, ehrenamtId, { name, email, telefon, text });
  } catch {
    return fehler("nicht_gefunden", 404);
  }
  return Response.json({ ok: true }, { status: 201 });
}
