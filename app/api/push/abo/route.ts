/** POST: Push-Benachrichtigungen abonnieren · DELETE: abbestellen */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { abonniere, kuendige } from "@/lib/push/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Abo = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "push")) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`push:${clientKey(req)}`, 20, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const b = z
    .object({ abo: Abo, themen: z.array(z.enum(["konto", "abfall", "meldungen"])).min(1), abfallBezirk: z.string().max(60).optional(), ortsteil: z.string().max(60).optional() })
    .safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const konto = await aktuellesKonto(tenant);
  const themen = b.data.themen.filter((t) => t !== "konto" || konto);
  await abonniere(tenant, b.data.abo, { kontoId: konto?.id, themen, abfallBezirk: b.data.abfallBezirk, ortsteil: b.data.ortsteil });
  return Response.json({ ok: true, themen });
}

export async function DELETE(req: Request) {
  const b = z.object({ endpoint: z.string().max(1000) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  await kuendige(b.data.endpoint);
  return Response.json({ ok: true });
}
