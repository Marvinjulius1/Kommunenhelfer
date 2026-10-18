/**
 * Veranstaltungen, Ferienprogramm und Ehrenamtsbörse.
 * Termine kommen aus der Config (feste Termine) und aus dem Backoffice (Redaktion).
 * Anmeldungen: Kontaktdaten verschlüsselt, Abmeldung per Link mit Zugangscode,
 * Warteliste mit automatischem Nachrücken. Löschung 30 Tage nach der Veranstaltung.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig, VeranstaltungConfig } from "@/config/types";
import { decryptJson, encryptJson, hashToken, safeEqualHex, zugangscode } from "@/lib/crypto";
import { berlinZuDate } from "@/lib/booking/slots";
import { ics, sendMail } from "@/lib/mail";
import type { AnmeldungRecord, EhrenamtRecord, InteresseRecord, VeranstaltungRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

export interface Veranstaltung extends VeranstaltungConfig {
  quelle: "config" | "redaktion";
}

export interface AnmeldeDaten {
  name: string;
  email: string;
  telefon?: string;
  hinweis?: string;
}

const jetztLokal = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).replace(" ", "T").slice(0, 16);

export async function veranstaltungen(tenant: GemeindeConfig, opt: { vergangene?: boolean } = {}): Promise<Veranstaltung[]> {
  const records = await store().list<VeranstaltungRecord>("veranstaltungen", (v) => v.tenant === tenant.slug);
  const alle: Veranstaltung[] = [
    ...(tenant.veranstaltungen ?? []).map((v) => ({ ...v, quelle: "config" as const })),
    ...records.map(({ id, titel, text, beginn, ende, ort, kategorie, vereinId, ferienprogramm, anmeldung, plaetze, kosten, alter }) => ({ id, titel, text, beginn, ende, ort, kategorie, vereinId, ferienprogramm, anmeldung, plaetze, kosten, alter, quelle: "redaktion" as const })),
  ];
  const jetzt = jetztLokal();
  return alle.filter((v) => opt.vergangene || (v.ende ?? v.beginn) >= jetzt).sort((a, b) => a.beginn.localeCompare(b.beginn));
}

export async function veranstaltung(tenant: GemeindeConfig, id: string) {
  return (await veranstaltungen(tenant, { vergangene: true })).find((v) => v.id === id);
}

export async function anmeldungen(tenant: GemeindeConfig, veranstaltungId: string) {
  return (await store().list<AnmeldungRecord>("anmeldungen", (a) => a.tenant === tenant.slug && a.veranstaltungId === veranstaltungId)).sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm));
}

export function belegt(liste: AnmeldungRecord[]) {
  return liste.filter((a) => a.status === "angemeldet").reduce((s, a) => s + a.anzahl, 0);
}

// Prozessweite Sperre je Veranstaltung – sonst vergeben gleichzeitige Anmeldungen denselben Platz
const g = globalThis as { __anmeldeSperren?: Map<string, Promise<unknown>> };
const sperren = (g.__anmeldeSperren ??= new Map());
function mitSperre<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const vorher = sperren.get(key) ?? Promise.resolve();
  const p = vorher.then(fn, fn);
  sperren.set(key, p.catch(() => undefined));
  return p;
}

function terminText(v: Veranstaltung) {
  const d = new Date(berlinZuDate(v.beginn.slice(0, 10), v.beginn.slice(11)).getTime());
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(d) + " Uhr";
}

function kalender(tenant: GemeindeConfig, v: Veranstaltung) {
  const start = berlinZuDate(v.beginn.slice(0, 10), v.beginn.slice(11));
  const ende = v.ende ? berlinZuDate(v.ende.slice(0, 10), v.ende.slice(11)) : new Date(start.getTime() + 2 * 3600_000);
  return ics({ uid: `${v.id}@${tenant.slug}`, start, minuten: Math.max(30, Math.round((ende.getTime() - start.getTime()) / 60_000)), titel: v.titel, ort: v.ort, beschreibung: v.text });
}

export function veranstaltungIcs(tenant: GemeindeConfig, v: Veranstaltung) {
  return kalender(tenant, v);
}

export async function melde(tenant: GemeindeConfig, v: Veranstaltung, d: AnmeldeDaten, anzahl: number, basis: string, kontoId?: string) {
  if (!v.anmeldung) throw new Error("keine_anmeldung");
  return mitSperre(`${tenant.slug}:${v.id}`, async () => {
    const liste = await anmeldungen(tenant, v.id);
    const frei = v.plaetze === undefined ? Infinity : v.plaetze - belegt(liste);
    const status: AnmeldungRecord["status"] = anzahl <= frei ? "angemeldet" : "warteliste";
    const code = zugangscode();
    const r: AnmeldungRecord = {
      id: randomBytes(10).toString("base64url"),
      tenant: tenant.slug,
      veranstaltungId: v.id,
      anzahl,
      status,
      tokenHash: hashToken(code),
      kontoId,
      daten: encryptJson(d),
      erstelltAm: new Date().toISOString(),
      loeschenAm: inTagen(30, new Date(Date.parse((v.ende ?? v.beginn).slice(0, 10) + "T23:59:59Z"))),
    };
    await store().put("anmeldungen", r);
    const abmelden = `${basis}/veranstaltungen/abmelden?id=${r.id}&c=${encodeURIComponent(code)}`;
    await sendMail(tenant, {
      to: d.email,
      subject: status === "angemeldet" ? `Anmeldung bestätigt: ${v.titel}` : `Warteliste: ${v.titel}`,
      text: [
        `Guten Tag ${d.name},`,
        "",
        status === "angemeldet"
          ? `Sie sind angemeldet${anzahl > 1 ? ` (${anzahl} Personen)` : ""}: ${v.titel}, ${terminText(v)}, ${v.ort}.`
          : `Die Veranstaltung „${v.titel}“ ist ausgebucht. Sie stehen auf der Warteliste – wird ein Platz frei, rücken Sie automatisch nach und wir schreiben Ihnen.`,
        v.kosten ? `Kosten: ${v.kosten}` : "",
        "",
        `Sie können nicht? Bitte melden Sie sich ab, dann bekommt jemand anderes den Platz: ${abmelden}`,
        "",
        "Freundliche Grüße",
        tenant.email.absenderName,
      ]
        .filter((z, i, a) => z !== "" || a[i - 1] !== "")
        .join("\n"),
      attachments: status === "angemeldet" ? [{ filename: "termin.ics", content: kalender(tenant, v), contentType: "text/calendar; charset=utf-8" }] : undefined,
    }).catch(() => undefined);
    return { id: r.id, code, status };
  });
}

export async function ladeAnmeldung(tenant: GemeindeConfig, id: string, code: string) {
  const a = await store().get<AnmeldungRecord>("anmeldungen", id);
  return a && a.tenant === tenant.slug && safeEqualHex(a.tokenHash, hashToken(code)) ? a : undefined;
}

/** Abmelden – und Nachrücken von der Warteliste. */
export async function storniere(tenant: GemeindeConfig, a: AnmeldungRecord) {
  const v = await veranstaltung(tenant, a.veranstaltungId);
  return mitSperre(`${tenant.slug}:${a.veranstaltungId}`, async () => {
    await store().put("anmeldungen", { ...a, status: "storniert" });
    if (!v || a.status !== "angemeldet") return 0;
    let frei = v.plaetze === undefined ? Infinity : v.plaetze - belegt(await anmeldungen(tenant, v.id));
    let n = 0;
    for (const w of (await anmeldungen(tenant, v.id)).filter((x) => x.status === "warteliste")) {
      if (w.anzahl > frei) continue;
      await store().put("anmeldungen", { ...w, status: "angemeldet" });
      frei -= w.anzahl;
      n++;
      const d = decryptJson<AnmeldeDaten>(w.daten);
      await sendMail(tenant, {
        to: d.email,
        subject: `Sie sind nachgerückt: ${v.titel}`,
        text: `Guten Tag ${d.name},\n\nein Platz ist frei geworden – Sie sind jetzt angemeldet: ${v.titel}, ${terminText(v)}, ${v.ort}.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
        attachments: [{ filename: "termin.ics", content: kalender(tenant, v), contentType: "text/calendar; charset=utf-8" }],
      }).catch(() => undefined);
    }
    return n;
  });
}

export async function legeVeranstaltungAn(tenant: GemeindeConfig, v: Omit<VeranstaltungConfig, "id">, autor: string) {
  const r: VeranstaltungRecord = {
    ...v,
    id: randomBytes(8).toString("base64url"),
    tenant: tenant.slug,
    autor,
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(60, new Date(Date.parse((v.ende ?? v.beginn).slice(0, 10) + "T23:59:59Z"))),
  };
  await store().put("veranstaltungen", r);
  return r;
}

export async function entferneVeranstaltung(tenant: GemeindeConfig, id: string) {
  const r = await store().get<VeranstaltungRecord>("veranstaltungen", id);
  if (!r || r.tenant !== tenant.slug) return false;
  await store().delete("veranstaltungen", id);
  return true;
}

// ---------------------------------------------------------------- Ehrenamt

export async function ehrenamt(tenant: GemeindeConfig) {
  const heute = new Date().toISOString().slice(0, 10);
  const records = await store().list<EhrenamtRecord>("ehrenamt", (e) => e.tenant === tenant.slug);
  return [...(tenant.ehrenamt ?? []).map((e) => ({ ...e, quelle: "config" as const })), ...records.map(({ id, titel, organisation, text, ort, zeit, kategorie, kontaktEmail, bis }) => ({ id, titel, organisation, text, ort, zeit, kategorie, kontaktEmail, bis, quelle: "redaktion" as const }))].filter(
    (e) => !e.bis || e.bis >= heute,
  );
}

export async function legeEhrenamtAn(tenant: GemeindeConfig, e: Pick<EhrenamtRecord, "titel" | "organisation" | "text" | "ort" | "zeit" | "kategorie" | "kontaktEmail" | "bis" | "autor">) {
  const r: EhrenamtRecord = { ...e, id: randomBytes(8).toString("base64url"), tenant: tenant.slug, erstelltAm: new Date().toISOString(), loeschenAm: e.bis ? inTagen(30, new Date(e.bis + "T23:59:59Z")) : inTagen(365) };
  await store().put("ehrenamt", r);
  return r;
}

/** „Ich helfe mit“: an die Organisation (falls E-Mail hinterlegt) und ins Backoffice. */
export async function meldeInteresse(tenant: GemeindeConfig, ehrenamtId: string, d: { name: string; email: string; telefon?: string; text: string }) {
  const e = (await ehrenamt(tenant)).find((x) => x.id === ehrenamtId);
  if (!e) throw new Error("nicht_gefunden");
  const r: InteresseRecord = { id: randomBytes(10).toString("base64url"), tenant: tenant.slug, ehrenamtId, daten: encryptJson(d), erstelltAm: new Date().toISOString(), loeschenAm: inTagen(90) };
  await store().put("interessen", r);
  if (e.kontaktEmail)
    await sendMail(tenant, {
      to: e.kontaktEmail,
      subject: `Ehrenamt: Jemand möchte helfen – ${e.titel}`,
      text: `Guten Tag,\n\nüber das Bürgerportal der ${tenant.art} ${tenant.name} möchte jemand bei „${e.titel}“ mithelfen:\n\nName: ${d.name}\nE-Mail: ${d.email}${d.telefon ? `\nTelefon: ${d.telefon}` : ""}\n\n${d.text}\n\nBitte melden Sie sich direkt bei der Person. Die Angaben werden im Portal nach 90 Tagen gelöscht.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
    }).catch(() => undefined);
  await sendMail(tenant, { to: d.email, subject: `Danke fürs Mithelfen: ${e.titel}`, text: `Guten Tag ${d.name},\n\nvielen Dank! Wir haben Ihre Nachricht an ${e.organisation} weitergegeben. Man meldet sich direkt bei Ihnen.\n\nFreundliche Grüße\n${tenant.email.absenderName}` }).catch(() => undefined);
  return r;
}

export async function interessen(tenant: GemeindeConfig) {
  return (await store().list<InteresseRecord>("interessen", (i) => i.tenant === tenant.slug)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm)).map((i) => ({ ...i, d: decryptJson<{ name: string; email: string; telefon?: string; text: string }>(i.daten) }));
}

/** Nachricht an einen Verein – die Adresse des Vereins bleibt verborgen. */
export async function schreibeVerein(tenant: GemeindeConfig, vereinId: string, d: { name: string; email: string; text: string }) {
  const v = tenant.vereine?.find((x) => x.id === vereinId);
  if (!v?.kontaktEmail) throw new Error("nicht_gefunden");
  await sendMail(tenant, { to: v.kontaktEmail, subject: `Anfrage über das Bürgerportal: ${v.name}`, text: `Guten Tag,\n\nüber das Bürgerportal der ${tenant.art} ${tenant.name} hat Sie jemand angeschrieben:\n\nName: ${d.name}\nE-Mail: ${d.email}\n\n${d.text}\n\nBitte antworten Sie direkt an die angegebene Adresse.` });
}
