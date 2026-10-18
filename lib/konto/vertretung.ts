/**
 * Vertretung: Vollmachten (z. B. Tochter für ihre Mutter) und Unternehmenskonten.
 *
 *  - Die vertretene Person erteilt die Vollmacht selbst, mit Umfang und optionalem
 *    Ablauf. Die bevollmächtigte Person nimmt sie mit dem eigenen Konto an.
 *  - Ein Unternehmen ist ein eigenes Konto ohne Login; Inhaber und Mitarbeitende
 *    handeln über eine Mitgliedschaft (dieselbe Mechanik wie die Vollmacht).
 *  - „Für jemanden handeln“ gilt nur für Anträge, Termine, Post und Zahlungen –
 *    nie für Profil, Sicherheit, Löschung oder Abstimmungen.
 *  - Jede Handlung im fremden Namen wird protokolliert und ist für die vertretene
 *    Person sichtbar. Widerruf jederzeit.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson, hashToken, safeEqualHex, zugangscode } from "@/lib/crypto";
import type { KontoRecord, VertretungsLogRecord, VollmachtRecord, VollmachtUmfang } from "@/lib/records";
import { pruefeSignatur, signiere } from "@/lib/signatur";
import { inTagen, store } from "@/lib/storage/store";
import type { Profil } from "./types";
import { aktuellesKonto, ladeKonto, profilVon, speichereKonto } from "./service";

export const UMFANG: Record<VollmachtUmfang, string> = {
  antraege: "Anträge stellen und Anliegen verfolgen",
  termine: "Termine buchen und absagen",
  post: "Bescheide und Nachrichten lesen",
  zahlungen: "Gebühren bezahlen",
};
export const ALLE: VollmachtUmfang[] = ["antraege", "termine", "post", "zahlungen"];
export const VERTRETUNG_COOKIE = "vertretung";
const STUNDEN = 8;

export interface VollmachtInhalt {
  vonName: string;
  anName?: string;
  anEmail?: string;
}

export const inhaltVon = (v: VollmachtRecord) => decryptJson<VollmachtInhalt>(v.inhalt);
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
export const gueltig = (v: VollmachtRecord) => v.status === "aktiv" && (!v.bis || v.bis >= heute());
const name = (k: KontoRecord) => {
  const p = profilVon(k);
  return [p.vorname, p.nachname].filter(Boolean).join(" ") || p.email || "Unbekannt";
};

export async function ladeVollmacht(tenant: GemeindeConfig, id: string) {
  const v = await store().get<VollmachtRecord>("vollmachten", id);
  return v && v.tenant === tenant.slug ? v : undefined;
}

/** Einladung anlegen. Gibt Datensatz und Code für den Link zurück. */
export async function erteile(tenant: GemeindeConfig, von: KontoRecord, d: { art: VollmachtRecord["art"]; anName: string; anEmail: string; umfang: VollmachtUmfang[]; bis?: string; rolle?: VollmachtRecord["rolle"] }) {
  const code = zugangscode();
  const r: VollmachtRecord = {
    id: randomBytes(10).toString("base64url"),
    tenant: tenant.slug,
    art: d.art,
    vonKontoId: von.id,
    rolle: d.rolle,
    umfang: d.umfang,
    bis: d.bis,
    status: "offen",
    einladungHash: hashToken(code),
    inhalt: encryptJson({ vonName: name(von), anName: d.anName, anEmail: d.anEmail } satisfies VollmachtInhalt),
    erstelltAm: new Date().toISOString(),
    // Offene Einladungen verfallen nach 14 Tagen; aktive Vollmachten bis zum Ende + 2 Jahre (Nachweis)
    loeschenAm: inTagen(14),
  };
  await store().put("vollmachten", r);
  return { vollmacht: r, code };
}

export async function nimmAn(tenant: GemeindeConfig, token: string, an: KontoRecord): Promise<VollmachtRecord | "ungueltig" | "eigene"> {
  const [id, code] = token.split(".");
  const v = id && code ? await ladeVollmacht(tenant, id) : undefined;
  if (!v || v.status !== "offen" || !v.einladungHash || !safeEqualHex(v.einladungHash, hashToken(code))) return "ungueltig";
  if (v.vonKontoId === an.id) return "eigene";
  // Wer bereits Mitglied ist, wird nicht doppelt aufgenommen
  if ((await erhalten(tenant, an.id)).some((x) => x.vonKontoId === v.vonKontoId)) return "ungueltig";
  const neu: VollmachtRecord = {
    ...v,
    anKontoId: an.id,
    status: "aktiv",
    einladungHash: undefined,
    inhalt: encryptJson({ ...inhaltVon(v), anName: name(an) }),
    loeschenAm: v.bis ? inTagen(730, new Date(v.bis + "T23:59:59Z")) : "9999-12-31T00:00:00.000Z",
  };
  await store().put("vollmachten", neu);
  return neu;
}

export async function widerrufe(v: VollmachtRecord) {
  await store().put("vollmachten", { ...v, status: "widerrufen", einladungHash: undefined, loeschenAm: inTagen(730) });
}

/** Erteilte Vollmachten bzw. Mitglieder eines Unternehmens */
export async function erteilt(tenant: GemeindeConfig, vonKontoId: string) {
  return (await store().list<VollmachtRecord>("vollmachten", (v) => v.tenant === tenant.slug && v.vonKontoId === vonKontoId && v.status !== "widerrufen")).sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm));
}

/** Vollmachten und Mitgliedschaften, die ein Konto erhalten hat (nur gültige) */
export async function erhalten(tenant: GemeindeConfig, anKontoId: string) {
  return (await store().list<VollmachtRecord>("vollmachten", (v) => v.tenant === tenant.slug && v.anKontoId === anKontoId)).filter(gueltig);
}

// ------------------------------------------------------------ Für jemanden handeln

export async function wechsle(v: VollmachtRecord | null) {
  const c = await cookies();
  if (!v) return c.delete(VERTRETUNG_COOKIE);
  c.set(VERTRETUNG_COOKIE, signiere({ v: v.id }, STUNDEN * 3600, "vertretung"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: STUNDEN * 3600 });
}

export interface Handelnd {
  /** Das Konto, in dessen Namen gehandelt wird (sonst das eigene) */
  konto: KontoRecord;
  /** Das angemeldete Konto */
  selbst: KontoRecord;
  vollmacht?: VollmachtRecord;
}

/**
 * Wer handelt gerade für wen? Ohne (gültige) Vertretung: das eigene Konto.
 * `braucht` = Umfang, den die Aktion erfordert; fehlt er, gilt das eigene Konto.
 */
export async function handelndesKonto(tenant: GemeindeConfig, braucht?: VollmachtUmfang): Promise<Handelnd | undefined> {
  const selbst = await aktuellesKonto(tenant);
  if (!selbst) return undefined;
  const t = pruefeSignatur<{ v: string }>((await cookies()).get(VERTRETUNG_COOKIE)?.value, "vertretung");
  if (!t) return { konto: selbst, selbst };
  const v = await ladeVollmacht(tenant, t.v);
  if (!v || !gueltig(v) || v.anKontoId !== selbst.id || (braucht && !v.umfang.includes(braucht))) return { konto: selbst, selbst };
  const konto = await ladeKonto(tenant, v.vonKontoId);
  return konto ? { konto, selbst, vollmacht: v } : { konto: selbst, selbst };
}

/** Kurzinfo für den Browser: Für wen wird gerade gehandelt? */
export async function vertretungSicht(tenant: GemeindeConfig) {
  const h = await handelndesKonto(tenant);
  if (!h?.vollmacht) return undefined;
  return { name: name(h.konto), art: h.vollmacht.art, umfang: h.vollmacht.umfang };
}

export async function protokolliereVertretung(h: Handelnd, aktion: string, details?: string) {
  if (!h.vollmacht) return;
  const r: VertretungsLogRecord = {
    id: randomBytes(10).toString("base64url"),
    tenant: h.konto.tenant,
    vollmachtId: h.vollmacht.id,
    vonKontoId: h.konto.id,
    anKontoId: h.selbst.id,
    aktion,
    details,
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(730),
  };
  await store().put("vertretungslog", r);
  // Organisationskonten bleiben aktiv, solange Mitglieder für sie handeln
  if (h.konto.art === "organisation") await speichereKonto({ ...h.konto, letzteAnmeldung: r.erstelltAm, loeschenAm: inTagen(3 * 365) });
}

export async function protokoll(tenant: GemeindeConfig, vonKontoId: string) {
  return (await store().list<VertretungsLogRecord>("vertretungslog", (l) => l.tenant === tenant.slug && l.vonKontoId === vonKontoId)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

/** Text für den Vorgang: wer hat für wen eingereicht */
export function fuerText(h: Handelnd) {
  if (!h.vollmacht) return undefined;
  const p = profilVon(h.selbst);
  const wer = [p.vorname, p.nachname].filter(Boolean).join(" ");
  return h.vollmacht.art === "organisation" ? `Für ${name(h.konto)}, eingereicht von ${wer}` : `Im Auftrag von ${name(h.konto)} (Vollmacht), eingereicht von ${wer}`;
}

// ------------------------------------------------------------ Unternehmen

export async function erstelleOrganisation(tenant: GemeindeConfig, inhaber: KontoRecord, d: { name: string; rechtsform?: string; strasse?: string; plz?: string; ort?: string; email: string; telefon?: string }) {
  const jetzt = new Date().toISOString();
  const profil: Profil = { vorname: "", nachname: d.name, email: d.email, telefon: d.telefon, strasse: d.strasse, plz: d.plz, ort: d.ort };
  const org: KontoRecord = {
    id: randomBytes(12).toString("base64url"),
    tenant: tenant.slug,
    art: "organisation",
    organisation: { rechtsform: d.rechtsform },
    vertrauensniveau: "basis",
    emailBestaetigt: false,
    profil: encryptJson(profil),
    einstellungen: { emailBenachrichtigung: true, pushBenachrichtigung: false, abfallErinnerung: false },
    letzteAnmeldung: jetzt,
    erstelltAm: jetzt,
    loeschenAm: inTagen(3 * 365),
  };
  await store().put("konten", org);
  const m: VollmachtRecord = {
    id: randomBytes(10).toString("base64url"),
    tenant: tenant.slug,
    art: "organisation",
    vonKontoId: org.id,
    anKontoId: inhaber.id,
    rolle: "inhaber",
    umfang: ALLE,
    status: "aktiv",
    inhalt: encryptJson({ vonName: d.name, anName: name(inhaber) } satisfies VollmachtInhalt),
    erstelltAm: jetzt,
    loeschenAm: "9999-12-31T00:00:00.000Z",
  };
  await store().put("vollmachten", m);
  return { org, mitgliedschaft: m };
}

export async function istInhaber(tenant: GemeindeConfig, orgId: string, kontoId: string) {
  return (await erhalten(tenant, kontoId)).some((v) => v.art === "organisation" && v.vonKontoId === orgId && v.rolle === "inhaber");
}

export { name as anzeigeName };

/** Kurzform: Konto, in dessen Namen für diesen Umfang gehandelt wird (oder das eigene). */
export async function kontoFuer(tenant: GemeindeConfig, umfang: VollmachtUmfang) {
  return (await handelndesKonto(tenant, umfang))?.konto;
}
