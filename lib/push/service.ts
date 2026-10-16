/**
 * Web-Push-Benachrichtigungen (Standard W3C Push API, VAPID).
 *
 * Schlüssel: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. Fehlen sie, wird ein stabiles
 * Schlüsselpaar aus DATA_ENCRYPTION_KEY abgeleitet (gleich bleibend über Neustarts).
 * Benachrichtigungen enthalten nie personenbezogene Inhalte – nur einen Hinweis.
 */
import "server-only";
import { createECDH, createHash, randomBytes } from "node:crypto";
import webpush from "web-push";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson, zweckSchluessel } from "@/lib/crypto";
import { aktiv } from "@/lib/funktionen";
import type { KontoRecord, PushRecord } from "@/lib/records";
import { zaehle } from "@/lib/statistik";
import { inTagen, store } from "@/lib/storage/store";

let schluessel: { publicKey: string; privateKey: string } | null = null;

export function vapid() {
  if (schluessel) return schluessel;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    schluessel = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(zweckSchluessel("vapid"));
    schluessel = { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: ecdh.getPrivateKey().toString("base64url") };
  }
  return schluessel;
}

export interface Abo {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export async function abonniere(tenant: GemeindeConfig, abo: Abo, opt: { kontoId?: string; themen: PushRecord["themen"]; abfallBezirk?: string; ortsteil?: string }) {
  const endpointHash = hash(abo.endpoint);
  const alt = (await store().list<PushRecord>("push", (p) => p.endpointHash === endpointHash))[0];
  const r: PushRecord = {
    id: alt?.id ?? randomBytes(12).toString("base64url"),
    tenant: tenant.slug,
    kontoId: opt.kontoId ?? alt?.kontoId,
    abo: encryptJson(abo),
    endpointHash,
    themen: opt.themen,
    abfallBezirk: opt.abfallBezirk,
    ortsteil: opt.ortsteil,
    erstelltAm: alt?.erstelltAm ?? new Date().toISOString(),
    loeschenAm: inTagen(400),
  };
  await store().put("push", r);
  return r;
}

/** Hält die Push-Abos eines Kontos im Einklang mit seinen Einstellungen (Themen, Bezirk, Ortsteil). */
export async function synchronisiereKonto(k: KontoRecord) {
  const e = k.einstellungen;
  for (const p of await store().list<PushRecord>("push", (x) => x.kontoId === k.id)) {
    if (!e.pushBenachrichtigung) {
      await store().delete("push", p.id);
      continue;
    }
    const themen: PushRecord["themen"] = ["konto", "meldungen", ...(e.abfallErinnerung && e.abfallBezirk ? (["abfall"] as const) : [])];
    await store().put("push", { ...p, themen, abfallBezirk: e.abfallBezirk, ortsteil: e.ortsteil });
  }
}

export async function kuendige(endpoint: string) {
  const h = hash(endpoint);
  for (const p of await store().list<PushRecord>("push", (x) => x.endpointHash === h)) await store().delete("push", p.id);
}

export interface Nachricht {
  titel: string;
  text: string;
  url?: string;
  kontoIds?: string[];
  thema?: PushRecord["themen"][number];
  abfallBezirk?: string;
  ortsteil?: string;
}

/** Sendet eine Benachrichtigung an passende Abos. Gibt die Anzahl erfolgreicher Zustellungen zurück. */
export async function benachrichtige(tenant: GemeindeConfig, n: Nachricht): Promise<number> {
  if (!aktiv(tenant, "push")) return 0;
  const abos = await store().list<PushRecord>(
    "push",
    (p) =>
      p.tenant === tenant.slug &&
      (n.kontoIds ? !!p.kontoId && n.kontoIds.includes(p.kontoId) && p.themen.includes("konto") : !!n.thema && p.themen.includes(n.thema)) &&
      (!n.abfallBezirk || p.abfallBezirk === n.abfallBezirk) &&
      (!n.ortsteil || !p.ortsteil || p.ortsteil === n.ortsteil),
  );
  if (!abos.length) return 0;
  const k = vapid();
  let ok = 0;
  await Promise.all(
    abos.map(async (p) => {
      try {
        await webpush.sendNotification(decryptJson<Abo>(p.abo), JSON.stringify({ titel: n.titel, text: n.text, url: n.url ?? "/" }), {
          vapidDetails: { subject: `mailto:${tenant.email.absenderAdresse}`, publicKey: k.publicKey, privateKey: k.privateKey },
          TTL: 24 * 3600,
        });
        ok++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await store().delete("push", p.id); // Abo existiert nicht mehr
      }
    }),
  );
  if (ok) await zaehle(tenant.slug, "push_gesendet", ok);
  return ok;
}
