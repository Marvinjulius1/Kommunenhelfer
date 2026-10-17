/**
 * FIT-Connect: Übermittlung von Anträgen an den Zustellpunkt einer Behörde
 * (föderale Infrastruktur für Onlinedienste nach OZG).
 *
 * Ablauf (Submission API v1):
 *   1. Token holen (OAuth 2.0 Client Credentials)
 *   2. Zustellpunkt laden → Schlüssel-ID (encryptionKid) und Verschlüsselungsschlüssel (JWK)
 *   3. Einreichung anlegen (angekündigte Anlagen)
 *   4. Anlagen verschlüsselt hochladen
 *   5. Metadaten und Fachdaten verschlüsselt absenden
 * Alle Inhalte werden Ende-zu-Ende für den Zustellpunkt verschlüsselt (JWE,
 * RSA-OAEP-256 + A256GCM). Das Portal kann sie danach nicht mehr lesen.
 *
 * STATUS: Implementiert nach der öffentlichen Spezifikation, aber noch NICHT gegen
 * die FIT-Connect-Testumgebung geprüft. Vor dem Echtbetrieb mit Testzugangsdaten
 * (Self-Service-Portal der FITKO) durchspielen.
 */
import "server-only";
import { createCipheriv, createHash, createPublicKey, publicEncrypt, randomBytes, randomUUID, constants, type JsonWebKey } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson } from "@/lib/crypto";
import type { VorgangDaten, VorgangRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** JWE Compact Serialization mit RSA-OAEP-256 (Schlüssel) und A256GCM (Inhalt). */
export function jwe(klartext: Buffer | string, jwk: JsonWebKey & { kid?: string }, cty = "application/json"): string {
  const header = b64u(JSON.stringify({ alg: "RSA-OAEP-256", enc: "A256GCM", kid: jwk.kid, cty }));
  const cek = randomBytes(32);
  const schluessel = publicEncrypt({ key: createPublicKey({ key: jwk, format: "jwk" }), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, cek);
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cek, iv);
  c.setAAD(Buffer.from(header, "ascii"));
  const ct = Buffer.concat([c.update(Buffer.isBuffer(klartext) ? klartext : Buffer.from(klartext)), c.final()]);
  return [header, b64u(schluessel), b64u(iv), b64u(ct), b64u(c.getAuthTag())].join(".");
}

const sha512 = (b: Buffer | string) => createHash("sha512").update(b).digest("hex");

export function fitConnectKonfiguriert() {
  return !!(process.env.FIT_CONNECT_CLIENT_ID && process.env.FIT_CONNECT_CLIENT_SECRET);
}

/**
 * Endpunkte. Für die Testumgebung sind die öffentlichen Adressen der FITKO hinterlegt.
 * Im Echtbetrieb hängt der Zustelldienst vom Zustellpunkt ab – deshalb müssen die
 * Adressen dort ausdrücklich gesetzt werden (kein Raten).
 */
function urls() {
  const test = (process.env.FIT_CONNECT_UMGEBUNG ?? "testing") !== "prod";
  const token = process.env.FIT_CONNECT_TOKEN_URL ?? (test ? "https://auth-testing.fit-connect.fitko.dev/token" : undefined);
  const api = process.env.FIT_CONNECT_SUBMISSION_URL ?? (test ? "https://submission-api-testing.fit-connect.fitko.dev" : undefined);
  if (!token || !api) throw new Error("FIT-Connect: Im Echtbetrieb FIT_CONNECT_TOKEN_URL und FIT_CONNECT_SUBMISSION_URL setzen");
  return { token, api };
}

const g = globalThis as { __fitToken?: { wert: string; bis: number } };
async function token(): Promise<string> {
  if (g.__fitToken && g.__fitToken.bis > Date.now() + 30_000) return g.__fitToken.wert;
  const r = await fetch(urls().token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.FIT_CONNECT_CLIENT_ID!, client_secret: process.env.FIT_CONNECT_CLIENT_SECRET! }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`FIT-Connect Token: ${r.status}`);
  const d = (await r.json()) as { access_token: string; expires_in: number };
  g.__fitToken = { wert: d.access_token, bis: Date.now() + d.expires_in * 1000 };
  return d.access_token;
}

async function api<T>(pfad: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(urls().api + pfad, {
    ...init,
    headers: { authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`FIT-Connect ${init.method ?? "GET"} ${pfad}: ${r.status}`);
  return (r.status === 204 ? undefined : r.json().catch(() => undefined)) as T;
}

/** Übermittelt einen Vorgang an den Zustellpunkt. Gibt die Submission-ID zurück. */
export async function uebermittle(tenant: GemeindeConfig, v: VorgangRecord, destinationId: string): Promise<string> {
  const leistung = tenant.leistungen.find((l) => l.id === v.leistungId);
  const ziel = await api<{ encryptionKid: string; services?: { identifier: string; submissionSchemas?: { schemaUri: string; mimeType: string }[] }[] }>(`/v1/destinations/${encodeURIComponent(destinationId)}`);
  const jwk = await api<JsonWebKey & { kid: string }>(`/v1/destinations/${encodeURIComponent(destinationId)}/keys/${encodeURIComponent(ziel.encryptionKid)}`);

  const kennung = leistung?.leistungsschluessel ? `urn:de:fim:leika:leistung:${leistung.leistungsschluessel}` : ziel.services?.[0]?.identifier;
  if (!kennung) throw new Error("FIT-Connect: Leistungsschlüssel fehlt");
  const schema = ziel.services?.find((s) => s.identifier === kennung)?.submissionSchemas?.[0] ?? ziel.services?.[0]?.submissionSchemas?.[0];
  if (!schema) throw new Error("FIT-Connect: Zustellpunkt nennt kein Fachdatenschema");

  const anlagen = await Promise.all(v.dokumente.map(async (d) => ({ id: randomUUID(), d, daten: await blobs.get(d.id) })));
  const angelegt = await api<{ submissionId: string; caseId: string }>("/v1/submissions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ destinationId, announcedAttachments: anlagen.map((a) => a.id), serviceType: { name: leistung ? leistung.id : "anliegen", identifier: kennung } }),
  });

  for (const a of anlagen) {
    if (!a.daten) throw new Error(`FIT-Connect: Anlage ${a.d.id} fehlt`);
    await api(`/v1/submissions/${angelegt.submissionId}/attachments/${a.id}`, { method: "PUT", headers: { "content-type": "application/jose" }, body: jwe(a.daten, jwk, a.d.typ) });
  }

  const d = decryptJson<VorgangDaten>(v.daten);
  const fachdaten = JSON.stringify({ vorgang: v.id, leistung: v.leistungId ?? null, eingegangenAm: v.erstelltAm, kontakt: d.kontakt, werte: d.werte ?? {}, nachricht: d.nachricht ?? null });
  const metadaten = JSON.stringify({
    $schema: "https://schema.fitko.de/fit-connect/metadata/1.0.0/metadata.schema.json",
    contentStructure: {
      data: { hash: { type: "sha512", content: sha512(fachdaten) }, submissionSchema: { schemaUri: schema.schemaUri, mimeType: "application/json" } },
      attachments: anlagen.map((a) => ({ hash: { type: "sha512", content: sha512(a.daten!) }, purpose: "attachment", mimeType: a.d.typ, filename: decryptJson<string>(a.d.name), attachmentId: a.id })),
    },
  });
  await api(`/v1/submissions/${angelegt.submissionId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ encryptedMetadata: jwe(metadaten, jwk), encryptedData: jwe(fachdaten, jwk) }),
  });
  return angelegt.submissionId;
}
