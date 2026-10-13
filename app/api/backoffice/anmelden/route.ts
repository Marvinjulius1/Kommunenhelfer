import { z } from "zod";
import { cookies } from "next/headers";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { cookieOptionen, findeBenutzer, gleicheHerkunft, pruefePasswort, SESSION_COOKIE, sitzungsToken } from "@/lib/backoffice/auth";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Schema = z.object({ name: z.string().trim().min(1).max(60), passwort: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`bo-login:${clientKey(req)}`, 10, 15 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const tenant = tenantAus(req);
  const b = findeBenutzer(tenant, body.name);
  if (!b || !pruefePasswort(body.passwort, b.hash)) {
    await protokolliere({ tenant: tenant.slug, benutzer: body.name.slice(0, 60), aktion: "anmeldung_fehlgeschlagen" });
    return fehler("anmeldung", 401);
  }
  (await cookies()).set(SESSION_COOKIE, sitzungsToken(tenant, b), cookieOptionen);
  await protokolliere({ tenant: tenant.slug, benutzer: b.name, aktion: "anmeldung" });
  return Response.json({ ok: true });
}
