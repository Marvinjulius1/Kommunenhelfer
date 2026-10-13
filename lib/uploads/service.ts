/**
 * Annahme hochgeladener Dateien (vor dem Absenden, als "Entwurf").
 * Reihenfolge der Prüfungen: Größe → Dateityp am Inhalt → aktive PDF-Inhalte →
 * Virenscan → Duplikate/Limits → Erkennung der Dokumentart → verschlüsselte Ablage.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { encryptJson, sha256Hex } from "@/lib/crypto";
import type { UploadRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { store } from "@/lib/storage/store";
import { bereinigeDateiname, erkenneTyp } from "./formate";
import { klassifiziere, klassifiziereMitModell } from "./klassifizieren";
import { analysierePdf } from "./pdf";
import { scanne } from "./virenscan";

export type UploadFehler =
  | "zu_gross"
  | "format"
  | "aktiver_inhalt"
  | "virus"
  | "scanner"
  | "zu_viele"
  | "gesamt_zu_gross"
  | "leer"
  | "deaktiviert";

export type UploadErgebnis =
  | { ok: true; record: UploadRecord; duplikat: boolean }
  | { ok: false; fehler: UploadFehler };

/** Zwischengespeicherte Uploads werden nach 24 Stunden gelöscht, falls nicht abgesendet. */
const ENTWURF_STUNDEN = 24;

export async function uploadsImEntwurf(tenant: GemeindeConfig, entwurf: string): Promise<UploadRecord[]> {
  return store().list<UploadRecord>("uploads", (u) => u.tenant === tenant.slug && u.entwurf === entwurf);
}

export async function nimmUploadAn(tenant: GemeindeConfig, eingabe: { entwurf: string; dateiname: string; daten: Buffer }): Promise<UploadErgebnis> {
  const cfg = tenant.uploads;
  if (!cfg.aktiv) return { ok: false, fehler: "deaktiviert" };
  const { daten } = eingabe;
  if (!daten.length) return { ok: false, fehler: "leer" };
  if (daten.length > cfg.maxDateiMB * 1024 * 1024) return { ok: false, fehler: "zu_gross" };

  const typ = erkenneTyp(daten);
  if (!typ) return { ok: false, fehler: "format" };

  let text = "";
  let seiten: number | undefined;
  if (typ === "application/pdf") {
    const pdf = analysierePdf(daten);
    if (pdf.aktiverInhalt) return { ok: false, fehler: "aktiver_inhalt" };
    text = pdf.text;
    seiten = pdf.seiten;
  }

  const scan = await scanne(daten);
  if (!scan.ok) return { ok: false, fehler: scan.grund === "virus" ? "virus" : "scanner" };

  const sha256 = sha256Hex(daten);
  const vorhanden = await uploadsImEntwurf(tenant, eingabe.entwurf);
  const doppelt = vorhanden.find((u) => u.sha256 === sha256);
  if (doppelt) return { ok: true, record: doppelt, duplikat: true };
  if (vorhanden.length >= cfg.maxDateien) return { ok: false, fehler: "zu_viele" };
  if (vorhanden.reduce((s, u) => s + u.groesse, 0) + daten.length > cfg.maxGesamtMB * 1024 * 1024) return { ok: false, fehler: "gesamt_zu_gross" };

  const name = bereinigeDateiname(eingabe.dateiname, typ);
  const k = klassifiziere(tenant, { dateiname: name, text });
  if (!k.sicher) {
    const modell = await klassifiziereMitModell(tenant, daten, typ);
    if (modell) Object.assign(k, { art: modell, sicher: true });
  }

  const id = randomBytes(18).toString("base64url");
  await blobs.put(id, daten);
  const jetzt = new Date();
  const record: UploadRecord = {
    id,
    tenant: tenant.slug,
    entwurf: eingabe.entwurf,
    typ,
    groesse: daten.length,
    sha256,
    seiten,
    art: k.art,
    artSicher: k.sicher,
    amtVorschlag: k.amtVorschlag,
    name: encryptJson(name),
    einwilligungAm: jetzt.toISOString(),
    erstelltAm: jetzt.toISOString(),
    loeschenAm: new Date(jetzt.getTime() + ENTWURF_STUNDEN * 3_600_000).toISOString(),
  };
  await store().put("uploads", record);
  return { ok: true, record, duplikat: false };
}

export async function entferneUpload(tenant: GemeindeConfig, entwurf: string, id: string): Promise<boolean> {
  const u = await store().get<UploadRecord>("uploads", id);
  if (!u || u.tenant !== tenant.slug || u.entwurf !== entwurf) return false;
  await store().delete("uploads", id);
  await blobs.delete(id);
  return true;
}

/** Nach dem Absenden: Zwischen-Datensätze entfernen (die Dateien gehören jetzt zum Vorgang). */
export async function uebernehmeUploads(ids: string[]) {
  for (const id of ids) await store().delete("uploads", id);
}

