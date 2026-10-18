/**
 * Status-Nachrichten per SMS oder WhatsApp – auch für Bürger ohne Konto.
 *
 * SMS_TRANSPORT=console (Standard): nur gekürzte Nummer + Anlass im Log, kein Inhalt.
 * SMS_TRANSPORT=http: POST an SMS_API_URL mit "Authorization: Bearer SMS_API_KEY"
 *   und JSON { to, text, sender, channel } – passt auf gängige EU-Gateways
 *   (ggf. kleinen Adapter davorschalten). WhatsApp nutzt WHATSAPP_API_URL/-KEY
 *   (WhatsApp Business über einen Anbieter mit Datenverarbeitung in der EU).
 *
 * Datenschutz: Nachrichten enthalten NIE Inhalte des Anliegens – nur Vorgangsnummer,
 * den neuen Stand und den Hinweis auf „Meine Anliegen“.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { aktiv } from "@/lib/funktionen";
import type { Kanal } from "@/lib/records";
import { zaehle } from "@/lib/statistik";

/** Deutsche und internationale Mobilnummern in E.164 (+49…). Festnetz ist für SMS ungeeignet, wird aber nicht geraten. */
export function normalisiereTelefon(roh: string): string | undefined {
  let n = roh.replace(/[\s()/.-]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  else if (n.startsWith("0")) n = "+49" + n.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(n)) return undefined;
  return n;
}

export function kanalVerfuegbar(tenant: GemeindeConfig, k: Kanal["kanal"]): boolean {
  if (k === "email") return true;
  if (k === "sms") return aktiv(tenant, "sms");
  return aktiv(tenant, "whatsapp");
}

const maskiere = (ziel: string) => (ziel.includes("@") ? ziel.replace(/^(.).*(@.*)$/, "$1…$2") : ziel.slice(0, 4) + "…" + ziel.slice(-2));

export async function sendeKurznachricht(tenant: GemeindeConfig, k: Exclude<Kanal["kanal"], "email">, an: string, text: string): Promise<boolean> {
  if (!kanalVerfuegbar(tenant, k)) return false;
  const url = k === "sms" ? process.env.SMS_API_URL : process.env.WHATSAPP_API_URL;
  const key = k === "sms" ? process.env.SMS_API_KEY : process.env.WHATSAPP_API_KEY;
  if (process.env.SMS_TRANSPORT !== "http" || !url) {
    console.info(`[${k}] an ${maskiere(an)} | ${text.length} Zeichen`);
    await zaehle(tenant.slug, "kurznachrichten");
    return true;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
      // Absenderkennung: max. 11 Zeichen, nur Buchstaben/Ziffern
      body: JSON.stringify({ to: an, text, sender: tenant.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 11) || "Rathaus", channel: k }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Gateway ${res.status}`);
    await zaehle(tenant.slug, "kurznachrichten");
    return true;
  } catch (e) {
    console.error(`[${k}] Versand fehlgeschlagen:`, (e as Error).message);
    return false;
  }
}
