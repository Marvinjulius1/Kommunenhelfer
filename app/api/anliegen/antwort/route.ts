/** POST /api/anliegen/antwort – Antwort des Bürgers auf eine Rückfrage des Amts. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { fuegeNachrichtHinzu, ladeMitCode, ladeVorgang, setzeStatus } from "@/lib/vorgaenge/service";
import { kontoFuer } from "@/lib/konto/vertretung";

export const runtime = "nodejs";

const Schema = z.object({ id: z.string().max(40), code: z.string().max(64).optional(), text: z.string().trim().min(1).max(2000) });

export async function POST(req: Request) {
  const rl = rateLimit(`antwort:${clientKey(req)}`, 10, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const tenant = await tenantAus(req);
  // Zugriff mit Zugangscode – oder als angemeldeter Kontoinhaber
  const konto = await kontoFuer(tenant, "antraege");
  const eigen = konto ? await ladeVorgang(tenant, body.id) : undefined;
  const v = body.code ? await ladeMitCode(tenant, body.id, body.code) : eigen && eigen.kontoId === konto!.id ? eigen : undefined;
  if (!v) return fehler("nicht_gefunden", 404);
  const neu = await fuegeNachrichtHinzu(tenant, v, { von: "buerger", text: body.text });
  // Nach der Antwort liegt der Ball wieder beim Amt.
  if (neu.status === "rueckfrage") await setzeStatus(neu, "in_bearbeitung");
  return Response.json({ ok: true });
}
