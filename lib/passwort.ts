/** Passwort-Hashing (scrypt) – für Bürgerkonten und Backoffice. */
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPasswort(passwort: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(passwort, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function pruefePasswort(passwort: string, gespeichert: string): boolean {
  const [verfahren, N, r, p, salt, hash] = gespeichert.split("$");
  if (verfahren !== "scrypt" || !hash) return false;
  const soll = Buffer.from(hash, "base64");
  const ist = scryptSync(passwort, Buffer.from(salt, "base64"), soll.length, { N: Number(N), r: Number(r), p: Number(p) });
  return timingSafeEqual(ist, soll);
}

/** Mindestanforderung: 10 Zeichen. Lange Passphrasen sind besser als Sonderzeichen-Regeln (BSI/NIST). */
export function passwortGenuegend(p: string): boolean {
  return p.length >= 10 && p.length <= 200;
}
