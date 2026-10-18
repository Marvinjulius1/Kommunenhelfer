/** GET – Anmeldung mit dem Rathaus-Konto starten (Weiterleitung zum Anmeldedienst der Verwaltung). */
import { cookies } from "next/headers";
import { basisUrl, fehler, tenantAus } from "@/lib/api";
import { autorisierungsUrl, discovery, SSO_COOKIE, ssoAnbieter, startDaten } from "@/lib/backoffice/sso";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { signiere } from "@/lib/signatur";

export const runtime = "nodejs";


export async function GET(req: Request) {
  const rl = rateLimit(`bo-sso:${clientKey(req)}`, 20, 15 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  const a = ssoAnbieter(tenant);
  if (!a) return fehler("nicht_gefunden", 404);
  try {
    const d = await discovery(a);
    const s = startDaten();
    // Lax statt Strict: Die Rückkehr vom Anmeldedienst ist eine Navigation von einer anderen Website
    (await cookies()).set(SSO_COOKIE, signiere({ s: s.state, n: s.nonce, v: s.verifier, g: tenant.slug }, 600, "backoffice-sso"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/backoffice/sso",
      maxAge: 600,
    });
    return Response.redirect(autorisierungsUrl(d, a, `${basisUrl(req, tenant)}/api/backoffice/sso/rueckkehr`, s), 302);
  } catch (e) {
    console.error("[sso] Start:", (e as Error).message);
    return Response.redirect(`${basisUrl(req, tenant)}/backoffice/anmelden?sso=nicht_erreichbar`, 302);
  }
}
