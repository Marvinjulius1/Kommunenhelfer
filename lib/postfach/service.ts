/**
 * Digitales Postfach: Bescheide und Nachrichten der Verwaltung.
 * Inhalte und Dateinamen verschlüsselt; Benachrichtigungs-E-Mails enthalten
 * NIE den Inhalt, nur den Hinweis auf ein neues Dokument.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import type { KontoRecord, PostfachRecord, VorgangDaten, VorgangRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { inTagen, store } from "@/lib/storage/store";
import { benachrichtige } from "@/lib/push/service";

export interface NeuePost {
  tenant: GemeindeConfig;
  art: PostfachRecord["art"];
  titel: string;
  text: string;
  kontoId?: string;
  vorgang?: VorgangRecord;
  datei?: { daten: Buffer; name: string; typ: PostfachRecord["dokument"] extends infer D ? (D extends { typ: infer T } ? T : never) : never };
  absender: string;
  /** Aufbewahrung im Postfach (Tage) */
  tage?: number;
}

export async function stelleZu(p: NeuePost): Promise<PostfachRecord> {
  const kontoId = p.kontoId ?? p.vorgang?.kontoId;
  let dokument: PostfachRecord["dokument"];
  if (p.datei) {
    const id = randomBytes(18).toString("base64url");
    await blobs.put(id, p.datei.daten);
    dokument = { id, typ: p.datei.typ, groesse: p.datei.daten.length, name: encryptJson(p.datei.name) };
  }
  const r: PostfachRecord = {
    id: randomBytes(12).toString("base64url"),
    tenant: p.tenant.slug,
    kontoId,
    vorgangId: p.vorgang?.id,
    art: p.art,
    inhalt: encryptJson({ titel: p.titel, text: p.text }),
    dokument,
    absender: p.absender,
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(p.tage ?? 365 * 2),
  };
  await store().put("postfach", r);

  // Benachrichtigung (ohne Inhalt)
  const email = kontoId
    ? await store().get<KontoRecord>("konten", kontoId).then((k) => (k && k.einstellungen.emailBenachrichtigung ? decryptJson<{ email: string }>(k.profil).email : undefined))
    : p.vorgang
      ? decryptJson<VorgangDaten>(p.vorgang.daten).kontakt.email
      : undefined;
  if (email && p.art !== "meldung") {
    await sendMail(p.tenant, {
      to: email,
      subject: p.art === "bescheid" ? "Neuer Bescheid in Ihrem Postfach" : "Neue Nachricht von Ihrer Verwaltung",
      text: `Guten Tag,\n\nin Ihrem Bürgerservice-Postfach liegt ${p.art === "bescheid" ? "ein neuer Bescheid" : "eine neue Nachricht"} für Sie bereit${p.vorgang ? ` (Vorgang ${p.vorgang.id})` : ""}.\n\nAus Datenschutzgründen senden wir den Inhalt nicht per E-Mail. Bitte melden Sie sich im Portal an${kontoId ? "" : " oder öffnen Sie „Meine Anliegen“ auf dem Gerät, mit dem Sie das Anliegen gestellt haben"}.\n\nFreundliche Grüße\n${p.tenant.email.absenderName}`,
    }).catch(() => undefined);
  }
  if (kontoId) await benachrichtige(p.tenant, { kontoIds: [kontoId], titel: p.art === "bescheid" ? "Neuer Bescheid" : "Neue Nachricht", text: "In Ihrem Postfach liegt etwas Neues.", url: "/konto/postfach" });
  return r;
}

export function postSicht(r: PostfachRecord) {
  const { titel, text } = decryptJson<{ titel: string; text: string }>(r.inhalt);
  return {
    id: r.id,
    art: r.art,
    titel,
    text,
    vorgangId: r.vorgangId,
    absender: r.absender,
    gelesenAm: r.gelesenAm,
    erstelltAm: r.erstelltAm,
    dokument: r.dokument ? { name: decryptJson<string>(r.dokument.name), groesse: r.dokument.groesse, typ: r.dokument.typ } : undefined,
  };
}

export async function postFuerKonto(k: KontoRecord) {
  return (await store().list<PostfachRecord>("postfach", (p) => p.kontoId === k.id)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function postFuerVorgang(tenant: string, vorgangId: string) {
  return (await store().list<PostfachRecord>("postfach", (p) => p.tenant === tenant && p.vorgangId === vorgangId)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export async function alsGelesen(r: PostfachRecord) {
  if (!r.gelesenAm) await store().put("postfach", { ...r, gelesenAm: new Date().toISOString() });
}
