/**
 * Verschlüsselung personenbezogener Daten "at rest" (AES-256-GCM).
 *
 * DATA_ENCRYPTION_KEY: 32 Byte, Base64-kodiert.
 *   Erzeugen: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * In der Entwicklung wird ohne Schlüssel ein fester Entwicklungsschlüssel
 * genutzt (mit Warnung). In Produktion ist der Schlüssel Pflicht.
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY muss 32 Byte (Base64) lang sein.");
    cachedKey = k;
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_ENCRYPTION_KEY fehlt. Ohne Schlüssel werden in Produktion keine Daten gespeichert.");
    }
    console.warn("[crypto] DATA_ENCRYPTION_KEY fehlt – Entwicklungsschlüssel wird verwendet. NICHT für Produktion!");
    cachedKey = createHash("sha256").update("buergerportal-dev-key").digest();
  }
  return cachedKey;
}

/** Verschlüsselt ein beliebiges JSON-Objekt. Ergebnis: "v1.<iv>.<tag>.<daten>" (Base64url). */
export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptJson<T>(payload: string): T {
  const [v, iv, tag, data] = payload.split(".");
  if (v !== "v1") throw new Error("Unbekanntes Verschlüsselungsformat");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

/** Verschlüsselt Binärdaten (Dokumente). Format: [12 Byte IV][16 Byte Tag][Daten]. */
export function encryptBuffer(data: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decryptBuffer(payload: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
}

/**
 * Abgeleiteter Schlüssel für einen bestimmten Zweck (z. B. Signaturen).
 * Nutzt SIGNING_SECRET, sonst wird er per HKDF aus DATA_ENCRYPTION_KEY abgeleitet.
 */
export function zweckSchluessel(zweck: string): Buffer {
  const basis = process.env.SIGNING_SECRET ? Buffer.from(process.env.SIGNING_SECRET) : key();
  return Buffer.from(hkdfSync("sha256", basis, Buffer.alloc(0), `buergerportal:${zweck}`, 32));
}

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Zugangscodes werden nur als Hash gespeichert. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Gut lesbare Vorgangsnummer, z. B. "MUS-2026-7K4QX". Ohne verwechselbare Zeichen. */
export function vorgangsnummer(prefix: string): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(5);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${code}`;
}

/** Geheimer Zugangscode, den nur die antragstellende Person erhält. */
export function zugangscode(): string {
  return randomBytes(18).toString("base64url");
}
