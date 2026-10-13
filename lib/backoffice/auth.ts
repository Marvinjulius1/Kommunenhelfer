/**
 * Backoffice-Anmeldung mit rollenbasierten Rechten (pro Amt).
 *
 * Benutzer kommen aus der Umgebungsvariable BACKOFFICE_USERS (JSON), z. B.:
 *   [{"name":"anna","gemeinde":"musterstadt","aemter":["steueramt"],"hash":"scrypt$…"}]
 *   aemter ["*"] = alle Ämter der Gemeinde. gemeinde "*" = alle Gemeinden (Betreiber).
 * Passwort-Hash erzeugen: npm run backoffice:benutzer
 *
 * Demo-Zugang (demo / demo): in der Entwicklung automatisch, in Produktion nur
 * mit BACKOFFICE_DEMO=1 (z. B. für eine Vorführung). Niemals mit echten Daten!
 */
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { GemeindeConfig } from "@/config/types";
import { pruefeSignatur, signiere } from "@/lib/signatur";

export interface BoBenutzer {
  name: string;
  gemeinde: string;
  aemter: string[];
  hash: string;
  demo?: boolean;
}

export const SESSION_COOKIE = "bo_sitzung";
const SESSION_STUNDEN = 8;

export function demoAktiv(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.BACKOFFICE_DEMO === "1";
}

export function benutzerListe(): BoBenutzer[] {
  let liste: BoBenutzer[] = [];
  try {
    liste = JSON.parse(process.env.BACKOFFICE_USERS || "[]");
  } catch {
    console.error("[backoffice] BACKOFFICE_USERS ist kein gültiges JSON.");
  }
  if (demoAktiv()) liste.push({ name: "demo", gemeinde: "*", aemter: ["*"], hash: "demo", demo: true });
  return liste;
}

export function hashPasswort(passwort: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(passwort, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function pruefePasswort(passwort: string, gespeichert: string): boolean {
  if (gespeichert === "demo") return passwort === "demo";
  const [verfahren, N, r, p, salt, hash] = gespeichert.split("$");
  if (verfahren !== "scrypt" || !hash) return false;
  const soll = Buffer.from(hash, "base64");
  const ist = scryptSync(passwort, Buffer.from(salt, "base64"), soll.length, { N: Number(N), r: Number(r), p: Number(p) });
  return timingSafeEqual(ist, soll);
}

export function findeBenutzer(tenant: GemeindeConfig, name: string): BoBenutzer | undefined {
  return benutzerListe().find((b) => b.name === name && (b.gemeinde === "*" || b.gemeinde === tenant.slug));
}

export function sitzungsToken(tenant: GemeindeConfig, b: BoBenutzer): string {
  return signiere({ u: b.name, g: tenant.slug }, SESSION_STUNDEN * 3600, "backoffice-sitzung");
}

export const cookieOptionen = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_STUNDEN * 3600,
};

/** Angemeldeter Benutzer für diese Gemeinde – oder null. */
export async function aktuellerBenutzer(tenant: GemeindeConfig): Promise<BoBenutzer | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = pruefeSignatur<{ u: string; g: string }>(token, "backoffice-sitzung");
  if (!s || s.g !== tenant.slug) return null;
  return findeBenutzer(tenant, s.u) ?? null;
}

export function darfAmt(b: BoBenutzer, amtId: string): boolean {
  return b.aemter.includes("*") || b.aemter.includes(amtId);
}

/** Schutz vor CSRF: zustandsändernde Anfragen nur von derselben Herkunft. */
export function gleicheHerkunft(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // gleiche Herkunft bei Formular-Navigation; Cookie ist zusätzlich SameSite=Strict
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
