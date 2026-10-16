/**
 * Ausweis-Status: „Ist mein Ausweis schon da?“
 * Das Bürgerbüro trägt Antragsnummern ein und meldet „abholbereit“.
 * Bürger fragen mit der Nummer nach oder lassen sich (mit Konto) benachrichtigen.
 * Die Nummer wird nur als HMAC gespeichert.
 */
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { zweckSchluessel } from "@/lib/crypto";
import { stelleZu } from "@/lib/postfach/service";
import type { AusweisRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";

export const STATUS_TEXT: Record<AusweisRecord["status"], string> = {
  unbekannt: "Noch nicht bei uns eingegangen",
  in_produktion: "Wird hergestellt",
  abholbereit: "Liegt zur Abholung bereit",
  abgeholt: "Abgeholt",
};

/** Antragsnummern sind 9–14 Zeichen (Ziffern/Buchstaben); Leerzeichen und Bindestriche werden ignoriert. */
export function normalisiereNummer(roh: string): string | undefined {
  const n = roh.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{9,14}$/.test(n) ? n : undefined;
}

function nummerIndex(tenant: string, nummer: string) {
  return createHmac("sha256", zweckSchluessel("index-ausweis")).update(`${tenant}:${nummer}`).digest("hex");
}

export async function findeAusweis(tenant: GemeindeConfig, nummer: string): Promise<AusweisRecord | undefined> {
  const idx = nummerIndex(tenant.slug, nummer);
  return (await store().list<AusweisRecord>("ausweise", (a) => a.tenant === tenant.slug && a.nummerIndex === idx))[0];
}

async function speichern(r: AusweisRecord) {
  // Abgeholte Einträge nach 30 Tagen löschen, sonst nach 6 Monaten
  await store().put("ausweise", { ...r, loeschenAm: inTagen(r.status === "abgeholt" ? 30 : 183) });
}

/** Bürger: Benachrichtigung abonnieren (legt einen Platzhalter an, falls die Nummer noch unbekannt ist). */
export async function merkeVor(tenant: GemeindeConfig, nummer: string, kontoId: string) {
  const vorhanden = await findeAusweis(tenant, nummer);
  const r: AusweisRecord = vorhanden ?? {
    id: randomBytes(9).toString("base64url"),
    tenant: tenant.slug,
    nummerIndex: nummerIndex(tenant.slug, nummer),
    status: "unbekannt",
    kontoIds: [],
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(183),
  };
  if (!r.kontoIds.includes(kontoId)) r.kontoIds = [...r.kontoIds, kontoId].slice(-5);
  await speichern(r);
  return r;
}

/** Backoffice: Status setzen. Bei „abholbereit“ werden vorgemerkte Konten benachrichtigt. */
export async function setzeAusweisStatus(tenant: GemeindeConfig, nummer: string, status: Exclude<AusweisRecord["status"], "unbekannt">, art?: AusweisRecord["art"]) {
  const vorhanden = await findeAusweis(tenant, nummer);
  const r: AusweisRecord = {
    ...(vorhanden ?? { id: randomBytes(9).toString("base64url"), tenant: tenant.slug, nummerIndex: nummerIndex(tenant.slug, nummer), kontoIds: [], erstelltAm: new Date().toISOString(), loeschenAm: "" }),
    status,
    art: art ?? vorhanden?.art,
    abholbereitAm: status === "abholbereit" ? new Date().toISOString() : vorhanden?.abholbereitAm,
  };
  await speichern(r);
  let benachrichtigt = 0;
  if (status === "abholbereit" && vorhanden?.status !== "abholbereit") {
    const amt = tenant.aemter.find((a) => a.id === "buergerbuero") ?? tenant.aemter[0];
    for (const kontoId of r.kontoIds) {
      await stelleZu({
        tenant,
        art: "nachricht",
        kontoId,
        titel: "Ihr Ausweis ist abholbereit",
        text: `Ihr neues Dokument liegt im ${typeof amt.name === "string" ? amt.name : amt.name.de} zur Abholung bereit${amt.ort ? ` (${amt.ort})` : ""}.\n\nBitte bringen Sie Ihr altes Dokument mit. Eine Abholung ist zu den Öffnungszeiten ohne Termin möglich.`,
        absender: typeof amt.name === "string" ? amt.name : amt.name.de,
        tage: 60,
      });
      benachrichtigt++;
    }
  }
  return { record: r, benachrichtigt };
}

export async function ausweiseListe(tenant: GemeindeConfig) {
  return (await store().list<AusweisRecord>("ausweise", (a) => a.tenant === tenant.slug && a.status !== "unbekannt")).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}
