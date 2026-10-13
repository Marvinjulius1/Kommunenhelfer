/**
 * Kurzlebige, signierte Tokens (HMAC-SHA256) – für Dokument-Links und Sitzungen.
 * Format: base64url(JSON).base64url(HMAC)
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { zweckSchluessel } from "@/lib/crypto";

export function signiere<T extends object>(daten: T, gueltigSekunden: number, zweck: string): string {
  const body = Buffer.from(JSON.stringify({ ...daten, exp: Math.floor(Date.now() / 1000) + gueltigSekunden })).toString("base64url");
  const sig = createHmac("sha256", zweckSchluessel(zweck)).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function pruefeSignatur<T>(token: string | undefined | null, zweck: string): (T & { exp: number }) | null {
  if (!token || token.length > 4096) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const soll = createHmac("sha256", zweckSchluessel(zweck)).update(body).digest();
  const ist = Buffer.from(sig, "base64url");
  if (ist.length !== soll.length || !timingSafeEqual(ist, soll)) return null;
  try {
    const daten = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof daten.exp !== "number" || daten.exp < Date.now() / 1000) return null;
    return daten;
  } catch {
    return null;
  }
}
