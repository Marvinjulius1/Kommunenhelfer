/**
 * Anmeldung im Backoffice mit dem Rathaus-Konto (OpenID Connect, Authorization Code + PKCE):
 * Microsoft Entra ID, ADFS, Keycloak u. a. Rechte kommen aus Gruppen bzw. App-Rollen.
 *
 * Konfiguration in BACKOFFICE_SSO (JSON-Array), Geheimnis nur als Name einer Variablen:
 *   [{"gemeinde":"musterstadt","name":"Microsoft","issuer":"https://login.microsoftonline.com/<tenant-id>/v2.0",
 *     "clientId":"…","clientSecretEnv":"SSO_SECRET_MUSTERSTADT",
 *     "gruppen":{"<Gruppen-ID oder App-Rolle>":{"aemter":["steueramt"],"rollen":["redaktion"]}}}]
 * Ohne passende Gruppe gibt es keinen Zugang (außer mit "standard").
 */
import "server-only";
import { constants, createHash, createPublicKey, randomBytes, verify, type JsonWebKey } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";

export const SSO_COOKIE = "bo_sso";

export interface SsoRechte {
  aemter: string[];
  rollen?: ("redaktion" | "admin")[];
}

export interface SsoAnbieter {
  gemeinde: string;
  /** Beschriftung des Knopfs, z. B. „Microsoft“ */
  name: string;
  issuer: string;
  clientId: string;
  clientSecretEnv?: string;
  /** Claim mit dem Benutzernamen (Standard: preferred_username, sonst email, sonst sub) */
  benutzerClaim?: string;
  gruppen: Record<string, SsoRechte>;
  /** Rechte für alle angemeldeten Konten ohne passende Gruppe (vorsichtig verwenden) */
  standard?: SsoRechte;
}

export function ssoAnbieter(tenant: GemeindeConfig): SsoAnbieter | undefined {
  try {
    const liste = JSON.parse(process.env.BACKOFFICE_SSO || "[]") as SsoAnbieter[];
    return liste.find((a) => a.gemeinde === tenant.slug);
  } catch {
    console.error("[sso] BACKOFFICE_SSO ist kein gültiges JSON.");
    return undefined;
  }
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

const g = globalThis as { __ssoCache?: Map<string, { zeit: number; daten: unknown }> };
const cache = (g.__ssoCache ??= new Map());

async function holeJson<T>(url: string, maxAlter = 3600_000, neu = false): Promise<T> {
  const c = cache.get(url);
  if (!neu && c && Date.now() - c.zeit < maxAlter) return c.daten as T;
  if (!/^https:\/\//.test(url) && !(process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url))) throw new Error("Nur HTTPS erlaubt");
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const daten = (await r.json()) as T;
  cache.set(url, { zeit: Date.now(), daten });
  return daten;
}

export async function discovery(a: SsoAnbieter): Promise<Discovery> {
  const d = await holeJson<Discovery>(`${a.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`);
  if (d.issuer.replace(/\/$/, "") !== a.issuer.replace(/\/$/, "")) throw new Error("Issuer stimmt nicht überein");
  return d;
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Startdaten: state, nonce und PKCE-Verifier (landen signiert im Cookie). */
export function startDaten() {
  const verifier = b64url(randomBytes(32));
  return { state: b64url(randomBytes(16)), nonce: b64url(randomBytes(16)), verifier, challenge: b64url(createHash("sha256").update(verifier).digest()) };
}

export function autorisierungsUrl(d: Discovery, a: SsoAnbieter, redirectUri: string, s: ReturnType<typeof startDaten>) {
  const u = new URL(d.authorization_endpoint);
  u.search = new URLSearchParams({
    response_type: "code",
    client_id: a.clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state: s.state,
    nonce: s.nonce,
    code_challenge: s.challenge,
    code_challenge_method: "S256",
  }).toString();
  return u.toString();
}

interface IdToken {
  iss: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nbf?: number;
  nonce?: string;
  sub: string;
  [claim: string]: unknown;
}

/** Signatur und Inhalt eines ID-Tokens prüfen (RS256/PS256/ES256 über die JWKS des Anbieters). */
export async function pruefeIdToken(token: string, a: SsoAnbieter, d: Discovery, nonce: string, jetzt = Date.now() / 1000): Promise<IdToken> {
  const [k, p, sig] = token.split(".");
  if (!k || !p || !sig) throw new Error("Token unvollständig");
  const kopf = JSON.parse(Buffer.from(k, "base64url").toString()) as { alg: string; kid?: string };
  const algs: Record<string, { hash: string; pss?: boolean; ec?: boolean }> = { RS256: { hash: "sha256" }, PS256: { hash: "sha256", pss: true }, ES256: { hash: "sha256", ec: true } };
  const alg = algs[kopf.alg];
  if (!alg) throw new Error(`Algorithmus ${kopf.alg} nicht erlaubt`);
  const finde = async (neu: boolean) => (await holeJson<{ keys: (JsonWebKey & { kid?: string; use?: string })[] }>(d.jwks_uri, 3600_000, neu)).keys.find((j) => (!kopf.kid || j.kid === kopf.kid) && j.use !== "enc");
  // Unbekannte Schlüssel-ID: Schlüssel könnten gewechselt worden sein – einmal neu laden
  const jwk = (await finde(false)) ?? (await finde(true));
  if (!jwk) throw new Error("Schlüssel nicht gefunden");
  const ok = verify(
    alg.hash,
    Buffer.from(`${k}.${p}`),
    { key: createPublicKey({ key: jwk, format: "jwk" }), ...(alg.pss ? { padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 } : {}), ...(alg.ec ? { dsaEncoding: "ieee-p1363" as const } : {}) },
    Buffer.from(sig, "base64url"),
  );
  if (!ok) throw new Error("Signatur ungültig");
  const c = JSON.parse(Buffer.from(p, "base64url").toString()) as IdToken;
  const spiel = 120;
  if (c.iss.replace(/\/$/, "") !== a.issuer.replace(/\/$/, "")) throw new Error("Issuer falsch");
  if (!(Array.isArray(c.aud) ? c.aud.includes(a.clientId) : c.aud === a.clientId)) throw new Error("Audience falsch");
  if (typeof c.exp !== "number" || c.exp < jetzt - spiel) throw new Error("Token abgelaufen");
  if ((c.nbf && c.nbf > jetzt + spiel) || (c.iat && c.iat > jetzt + spiel)) throw new Error("Token aus der Zukunft");
  if (c.nonce !== nonce) throw new Error("Nonce falsch");
  return c;
}

export async function tauscheCode(a: SsoAnbieter, d: Discovery, code: string, redirectUri: string, verifier: string): Promise<string> {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: a.clientId, code_verifier: verifier });
  const secret = a.clientSecretEnv ? process.env[a.clientSecretEnv] : undefined;
  if (secret) body.set("client_secret", secret);
  const r = await fetch(d.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body, signal: AbortSignal.timeout(8000) });
  const j = (await r.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!r.ok || !j.id_token) throw new Error(`Token-Abruf fehlgeschlagen${j.error ? `: ${j.error}` : ""}`);
  return j.id_token;
}

/** Rechte aus Gruppen und App-Rollen zusammenführen – oder undefined (kein Zugang). */
export function rechteAus(a: SsoAnbieter, c: Record<string, unknown>): SsoRechte | undefined {
  const werte = new Set<string>([...(Array.isArray(c.groups) ? c.groups : []), ...(Array.isArray(c.roles) ? c.roles : [])].map(String));
  const treffer = Object.entries(a.gruppen).filter(([k]) => werte.has(k)).map(([, r]) => r);
  if (!treffer.length) return a.standard;
  const aemter = [...new Set(treffer.flatMap((r) => r.aemter))];
  const rollen = [...new Set(treffer.flatMap((r) => r.rollen ?? []))];
  return { aemter, ...(rollen.length ? { rollen } : {}) };
}

export function benutzerName(a: SsoAnbieter, c: Record<string, unknown>): string {
  const n = c[a.benutzerClaim ?? "preferred_username"] ?? c.email ?? c.sub;
  return String(n).slice(0, 120);
}
