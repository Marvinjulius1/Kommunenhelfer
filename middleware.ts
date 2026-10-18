/**
 * Middleware:
 *  1. Mandanten-Auflösung über die Subdomain (musterstadt.meinportal.de → "musterstadt")
 *  2. Content-Security-Policy mit Nonce + Sicherheits-Header
 *
 * Vorschau in der Entwicklung: http://localhost:3000/?gemeinde=beispielhausen
 * (setzt ein Cookie; in Produktion nur mit ALLOW_TENANT_PREVIEW=1).
 */
import { NextResponse, type NextRequest } from "next/server";
import { tenants, DEFAULT_TENANT } from "@/tenants";

const FORMAT = /^[a-z0-9-]{2,40}$/;
const PREVIEW = process.env.NODE_ENV !== "production" || process.env.ALLOW_TENANT_PREVIEW === "1" || process.env.DEMO_MODUS === "1";

function tenantFuer(req: NextRequest): { slug: string; setCookie?: string } {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
  const sub = host.split(".")[0];
  if (host.includes(".") && tenants[sub]) return { slug: sub };

  if (PREVIEW) {
    // Auch im Betreiber-Bereich angelegte Gemeinden – der Server prüft, ob es sie gibt
    const q = req.nextUrl.searchParams.get("gemeinde");
    if (q && FORMAT.test(q)) return { slug: q, setCookie: q };
    const c = req.cookies.get("gemeinde")?.value;
    if (c && FORMAT.test(c)) return { slug: c };
  }
  // Subdomain einer im Portal angelegten Gemeinde (unbekannte fallen auf die Standard-Gemeinde zurück)
  if (host.split(".").length >= 3 && FORMAT.test(sub) && sub !== "www") return { slug: sub };
  return { slug: DEFAULT_TENANT };
}

export function middleware(req: NextRequest) {
  const { slug, setCookie } = tenantFuer(req);
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    dev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-tenant", slug); // überschreibt einen evtl. vom Client gesendeten Header
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), interest-cohort=()");
  if (!dev) res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  if (setCookie) res.cookies.set("gemeinde", setCookie, { path: "/", sameSite: "lax", httpOnly: true });
  return res;
}

export const config = {
  // Statische Dateien und Bilder ausnehmen.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|tenants/|api/dokument/).*)"],
};
