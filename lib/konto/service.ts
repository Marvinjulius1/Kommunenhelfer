/**
 * Bürgerkonto – Server-Logik.
 *
 * Datenschutz:
 *  - Profil (Name, Adresse, IBAN …) nur verschlüsselt (AES-256-GCM)
 *  - E-Mail und Ausweis-Pseudonym nur als HMAC-Index (Auffinden ohne Klartext)
 *  - Sitzungen serverseitig widerrufbar ("Auf allen Geräten abmelden")
 *  - Löschkonzept: 3 Jahre nach der letzten Anmeldung wird das Konto gelöscht
 */
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson, zweckSchluessel } from "@/lib/crypto";
import type { AnmeldungRecord, AusweisRecord, IdeeRecord, KontoRecord, PostfachRecord, SafeRecord, SitzungRecord, TerminRecord, VorgangRecord, WarteRecord, ZahlungRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { pruefeSignatur, signiere } from "@/lib/signatur";
import { inTagen, store } from "@/lib/storage/store";
import type { Einstellungen, KontoSicht, Profil, Vertrauensniveau } from "./types";

export const KONTO_COOKIE = "konto";
const SITZUNG_TAGE = 30;
const INAKTIV_TAGE = 3 * 365;

export const STANDARD_EINSTELLUNGEN: Einstellungen = { emailBenachrichtigung: true, pushBenachrichtigung: false, abfallErinnerung: false };

export function index(zweck: "email" | "eid", wert: string, tenant: string): string {
  return createHmac("sha256", zweckSchluessel(`index-${zweck}`)).update(`${tenant}:${wert.trim().toLowerCase()}`).digest("hex");
}

export function profilVon(k: KontoRecord): Profil {
  return decryptJson<Profil>(k.profil);
}

export function sicht(k: KontoRecord): KontoSicht {
  const p = profilVon(k);
  return {
    id: k.id,
    vorname: p.vorname,
    nachname: p.nachname,
    email: p.email,
    telefon: p.telefon,
    strasse: p.strasse,
    plz: p.plz,
    ort: p.ort,
    geburtsdatum: p.geburtsdatum,
    vertrauensniveau: k.vertrauensniveau,
    emailBestaetigt: k.emailBestaetigt,
  };
}

export async function findeKontoPerEmail(tenant: GemeindeConfig, email: string) {
  const i = index("email", email, tenant.slug);
  return (await store().list<KontoRecord>("konten", (k) => k.tenant === tenant.slug && k.emailIndex === i))[0];
}

export async function ladeKonto(tenant: GemeindeConfig, id: string) {
  const k = await store().get<KontoRecord>("konten", id);
  return k && k.tenant === tenant.slug ? k : undefined;
}

export async function erstelleKonto(
  tenant: GemeindeConfig,
  v: { profil: Profil; passwortHash?: string; eid?: string; vertrauensniveau: Vertrauensniveau; emailBestaetigt: boolean },
): Promise<KontoRecord> {
  const jetzt = new Date().toISOString();
  const k: KontoRecord = {
    id: randomBytes(12).toString("base64url"),
    tenant: tenant.slug,
    emailIndex: v.profil.email ? index("email", v.profil.email, tenant.slug) : undefined,
    eidIndex: v.eid ? index("eid", v.eid, tenant.slug) : undefined,
    passwortHash: v.passwortHash,
    vertrauensniveau: v.vertrauensniveau,
    emailBestaetigt: v.emailBestaetigt,
    profil: encryptJson(v.profil),
    einstellungen: { ...STANDARD_EINSTELLUNGEN },
    letzteAnmeldung: jetzt,
    erstelltAm: jetzt,
    loeschenAm: inTagen(INAKTIV_TAGE),
  };
  await store().put("konten", k);
  return k;
}

export async function speichereKonto(k: KontoRecord) {
  await store().put("konten", k);
}

export async function aktualisiereProfil(k: KontoRecord, aenderung: Partial<Profil>, tenant: GemeindeConfig) {
  const profil = { ...profilVon(k), ...aenderung };
  const neu: KontoRecord = { ...k, profil: encryptJson(profil), emailIndex: profil.email ? index("email", profil.email, tenant.slug) : k.emailIndex };
  await store().put("konten", neu);
  return neu;
}

function geraetAus(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} auf ${os}` : browser;
}

/** Meldet an: neue Sitzung + Cookie. Verlängert die Löschfrist des Kontos. */
export async function anmelden(k: KontoRecord) {
  const jetzt = new Date();
  const ua = (await headers()).get("user-agent") ?? "";
  const s: SitzungRecord = {
    id: randomBytes(18).toString("base64url"),
    tenant: k.tenant,
    kontoId: k.id,
    geraet: geraetAus(ua),
    erstelltAm: jetzt.toISOString(),
    loeschenAm: inTagen(SITZUNG_TAGE, jetzt),
  };
  await store().put("sitzungen", s);
  await store().put("konten", { ...k, letzteAnmeldung: jetzt.toISOString(), loeschenAm: inTagen(INAKTIV_TAGE, jetzt) });
  (await cookies()).set(KONTO_COOKIE, signiere({ s: s.id }, SITZUNG_TAGE * 86400, "konto-sitzung"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITZUNG_TAGE * 86400,
  });
}

async function sitzungAusCookie(): Promise<SitzungRecord | undefined> {
  const t = pruefeSignatur<{ s: string }>((await cookies()).get(KONTO_COOKIE)?.value, "konto-sitzung");
  if (!t) return undefined;
  return store().get<SitzungRecord>("sitzungen", t.s);
}

/** Angemeldetes Konto dieser Gemeinde – oder undefined. */
export async function aktuellesKonto(tenant: GemeindeConfig): Promise<KontoRecord | undefined> {
  const s = await sitzungAusCookie();
  if (!s || s.tenant !== tenant.slug) return undefined;
  return ladeKonto(tenant, s.kontoId);
}

export async function abmelden(alle = false) {
  const s = await sitzungAusCookie();
  if (s) {
    if (alle) for (const x of await store().list<SitzungRecord>("sitzungen", (y) => y.kontoId === s.kontoId)) await store().delete("sitzungen", x.id);
    else await store().delete("sitzungen", s.id);
  }
  (await cookies()).delete(KONTO_COOKIE);
}

export async function sitzungenVon(k: KontoRecord) {
  const aktuell = await sitzungAusCookie();
  return (await store().list<SitzungRecord>("sitzungen", (s) => s.kontoId === k.id))
    .sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm))
    .map((s) => ({ id: s.id, geraet: s.geraet, seit: s.erstelltAm, diese: s.id === aktuell?.id }));
}

/** Alle Vorgänge und Termine eines Kontos (geräteübergreifend). */
export async function anliegenVon(k: Pick<KontoRecord, "id">) {
  const vorgaenge = await store().list<VorgangRecord>("vorgaenge", (v) => v.kontoId === k.id);
  const termine = await store().list<TerminRecord>("termine", (t) => t.kontoId === k.id);
  return { vorgaenge, termine };
}

/**
 * Entfernt ein Konto mit allen persönlichen Daten (auch ohne Anfrage-Kontext, z. B. Löschfrist).
 * Vorgänge und Termine bleiben (gesetzliche Aufbewahrung), werden aber vom Konto gelöst.
 * Zahlungen bleiben wegen haushaltsrechtlicher Aufbewahrung, ebenfalls ohne Kontobezug.
 */
export async function entferneKontoDaten(k: Pick<KontoRecord, "id">) {
  const s = store();
  for (const x of await s.list<SitzungRecord>("sitzungen", (y) => y.kontoId === k.id)) await s.delete("sitzungen", x.id);
  const { vorgaenge, termine } = await anliegenVon(k);
  for (const v of vorgaenge) await s.put("vorgaenge", { ...v, kontoId: undefined });
  for (const t of termine) await s.put("termine", { ...t, kontoId: undefined });
  for (const z of await s.list<ZahlungRecord>("zahlungen", (x) => x.kontoId === k.id)) await s.put("zahlungen", { ...z, kontoId: undefined });
  for (const p of await s.list<PostfachRecord>("postfach", (x) => x.kontoId === k.id)) {
    // Post zu einem Vorgang bleibt für „Meine Anliegen“ (Zugangscode) erhalten
    if (p.vorgangId) await s.put("postfach", { ...p, kontoId: undefined });
    else {
      if (p.dokument) await blobs.delete(p.dokument.id);
      await s.delete("postfach", p.id);
    }
  }
  for (const x of await s.list<SafeRecord>("safe", (y) => y.kontoId === k.id)) {
    await blobs.delete(x.id);
    await s.delete("safe", x.id);
  }
  for (const a of await s.list<AusweisRecord>("ausweise", (x) => x.kontoIds.includes(k.id))) await s.put("ausweise", { ...a, kontoIds: a.kontoIds.filter((id) => id !== k.id) });
  for (const w of await s.list<WarteRecord>("wartenummern", (x) => x.kontoId === k.id)) await s.put("wartenummern", { ...w, kontoId: undefined });
  for (const i of await s.list<IdeeRecord>("ideen", (x) => x.kontoId === k.id)) await s.put("ideen", { ...i, kontoId: undefined });
  for (const a of await s.list<AnmeldungRecord>("anmeldungen", (x) => x.kontoId === k.id)) await s.put("anmeldungen", { ...a, kontoId: undefined });
  for (const sammlung of ["checklisten", "push", "kitawuensche"]) {
    for (const r of await s.list<{ id: string; kontoId?: string; tenant: string; erstelltAm: string; loeschenAm: string }>(sammlung, (x) => x.kontoId === k.id)) {
      await s.delete(sammlung, r.id);
    }
  }
  await s.delete("konten", k.id);
}

/** DSGVO Art. 17: Konto auf Wunsch löschen und abmelden. */
export async function loescheKonto(k: KontoRecord) {
  await entferneKontoDaten(k);
  (await cookies()).delete(KONTO_COOKIE);
}

/** Token für E-Mail-Bestätigung und Passwort-Zurücksetzen (signiert, kurzlebig). */
export function kontoToken(zweck: "bestaetigen" | "passwort", kontoId: string, stunden: number) {
  return signiere({ k: kontoId }, stunden * 3600, `konto-${zweck}`);
}
export function pruefeKontoToken(zweck: "bestaetigen" | "passwort", token: string | null) {
  return pruefeSignatur<{ k: string }>(token, `konto-${zweck}`)?.k;
}

/** Wird E-Mail tatsächlich versendet? Ohne SMTP gilt die Adresse als bestätigt (Demo/Entwicklung). */
export function mailAktiv() {
  return process.env.MAIL_TRANSPORT === "smtp";
}
