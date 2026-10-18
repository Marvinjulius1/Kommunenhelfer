/**
 * Schnittstelle für Fachverfahren (Steuer, Melderegister, Ordnungsamt, DMS …).
 *
 * Fachverfahren holen neue Vorgänge ab und melden Status, Rückfragen, Bescheide und
 * Gebühren zurück – so müssen Daten nicht doppelt getippt werden.
 * Zugang per Schlüssel (Bearer-Token), gespeichert nur als SHA-256-Hash in der
 * Umgebungsvariable SCHNITTSTELLEN (JSON), erzeugt mit `npm run schnittstelle:schluessel`:
 *   [{"name":"Steuer-Fachverfahren","gemeinde":"musterstadt","aemter":["steueramt"],"hash":"…"}]
 */
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";

export interface Schnittstelle {
  name: string;
  gemeinde: string;
  aemter: string[];
  hash: string;
}

export function schnittstellen(): Schnittstelle[] {
  try {
    return JSON.parse(process.env.SCHNITTSTELLEN || "[]");
  } catch {
    console.error("[schnittstelle] SCHNITTSTELLEN ist kein gültiges JSON.");
    return [];
  }
}

export function pruefeSchluessel(req: Request, tenant: GemeindeConfig): Schnittstelle | undefined {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S{20,})$/)?.[1];
  if (!token) return undefined;
  const h = createHash("sha256").update(token).digest();
  return schnittstellen().find((s) => {
    if (s.gemeinde !== tenant.slug && s.gemeinde !== "*") return false;
    const erwartet = Buffer.from(s.hash, "hex");
    return erwartet.length === h.length && timingSafeEqual(erwartet, h);
  });
}

export const darfAmt = (s: Schnittstelle, amtId: string) => s.aemter.includes("*") || s.aemter.includes(amtId);
