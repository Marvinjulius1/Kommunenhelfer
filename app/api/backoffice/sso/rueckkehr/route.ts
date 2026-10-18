/** GET ?code&state – Rückkehr vom Anmeldedienst: Token prüfen, Rechte aus Gruppen, Sitzung anlegen. */
import { cookies } from "next/headers";
import { basisUrl, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { cookieOptionen, SESSION_COOKIE, sitzungsToken } from "@/lib/backoffice/auth";
import { benutzerName, discovery, pruefeIdToken, rechteAus, SSO_COOKIE, ssoAnbieter, tauscheCode } from "@/lib/backoffice/sso";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { pruefeSignatur } from "@/lib/signatur";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`bo-sso:${clientKey(req)}`, 20, 15 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  const basis = basisUrl(req, tenant);
  const zurueck = (grund: string) => Response.redirect(`${basis}/backoffice/anmelden?sso=${grund}`, 302);
  const a = ssoAnbieter(tenant);
  const jar = await cookies();
  const s = pruefeSignatur<{ s: string; n: string; v: string; g: string }>(jar.get(SSO_COOKIE)?.value, "backoffice-sso");
  jar.delete({ name: SSO_COOKIE, path: "/api/backoffice/sso" });
  const q = new URL(req.url).searchParams;
  if (!a || !s || s.g !== tenant.slug || q.get("state") !== s.s) return zurueck("abgelaufen");
  if (q.get("error") || !q.get("code")) return zurueck("abgebrochen");
  let name: string;
  try {
    const d = await discovery(a);
    const idToken = await tauscheCode(a, d, q.get("code")!, `${basis}/api/backoffice/sso/rueckkehr`, s.v);
    const claims = await pruefeIdToken(idToken, a, d, s.n);
    name = benutzerName(a, claims);
    const rechte = rechteAus(a, claims);
    if (!rechte || !rechte.aemter.length) {
      await protokolliere({ tenant: tenant.slug, benutzer: name, aktion: "anmeldung_fehlgeschlagen", details: "SSO: keine passende Gruppe" });
      return zurueck("keine_rechte");
    }
    jar.set(SESSION_COOKIE, sitzungsToken(tenant, { name, gemeinde: tenant.slug, aemter: rechte.aemter, rollen: rechte.rollen, hash: "sso" }, rechte), cookieOptionen);
  } catch (e) {
    console.error("[sso] Rückkehr:", (e as Error).message);
    return zurueck("fehler");
  }
  await protokolliere({ tenant: tenant.slug, benutzer: name, aktion: "anmeldung", details: `SSO (${a.name})` });
  // Das Sitzungs-Cookie ist SameSite=Strict: Erst eine Navigation von der eigenen Seite nimmt es mit
  return new Response(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/backoffice"><title>Anmeldung</title><p><a href="/backoffice">Weiter zum Backoffice</a></p>`, {
    headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
