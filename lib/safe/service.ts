/**
 * Dokumentensafe im Bürgerkonto: Bürger legen Unterlagen (z. B. Ausweiskopie,
 * Versicherungsnachweis) einmal ab und verwenden sie für spätere Anträge wieder.
 * Verschlüsselt; Löschung durch den Bürger oder mit dem Konto.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson } from "@/lib/crypto";
import type { KontoRecord, SafeRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { store } from "@/lib/storage/store";
import { bereinigeDateiname } from "@/lib/uploads/formate";
import { klassifiziere } from "@/lib/uploads/klassifizieren";
import { legeUploadAn, pruefeDatei, type UploadFehler } from "@/lib/uploads/service";

export const SAFE_MAX_DATEIEN = 30;

export async function safeVon(k: KontoRecord) {
  return (await store().list<SafeRecord>("safe", (s) => s.kontoId === k.id)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export function safeSicht(s: SafeRecord) {
  return { id: s.id, art: s.art, typ: s.typ, groesse: s.groesse, seiten: s.seiten, name: decryptJson<string>(s.name), erstelltAm: s.erstelltAm };
}

export async function legeInSafe(tenant: GemeindeConfig, k: KontoRecord, dateiname: string, daten: Buffer): Promise<{ ok: true; record: SafeRecord } | { ok: false; fehler: UploadFehler }> {
  const vorhanden = await safeVon(k);
  if (vorhanden.length >= SAFE_MAX_DATEIEN) return { ok: false, fehler: "zu_viele" };
  const p = await pruefeDatei(daten, tenant.uploads.maxDateiMB);
  if (!p.ok) return p;
  const doppelt = vorhanden.find((s) => s.sha256 === p.datei.sha256);
  if (doppelt) return { ok: true, record: doppelt };
  const name = bereinigeDateiname(dateiname, p.datei.typ);
  const id = randomBytes(18).toString("base64url");
  await blobs.put(id, daten);
  const r: SafeRecord = {
    id,
    tenant: tenant.slug,
    kontoId: k.id,
    art: klassifiziere(tenant, { dateiname: name, text: p.datei.text }).art,
    typ: p.datei.typ,
    groesse: daten.length,
    seiten: p.datei.seiten,
    sha256: p.datei.sha256,
    name: encryptJson(name),
    erstelltAm: new Date().toISOString(),
    // Bleibt, bis der Bürger es löscht (oder das Konto gelöscht wird)
    loeschenAm: "9999-12-31T00:00:00.000Z",
  };
  await store().put("safe", r);
  return { ok: true, record: r };
}

export async function ladeSafe(k: KontoRecord, id: string) {
  const s = await store().get<SafeRecord>("safe", id);
  return s && s.kontoId === k.id ? s : undefined;
}

export async function loescheAusSafe(s: SafeRecord) {
  await store().delete("safe", s.id);
  await blobs.delete(s.id);
}

/** Kopiert ein Safe-Dokument als Upload in einen Entwurf (z. B. für eine Einreichung). */
export async function safeInEntwurf(tenant: GemeindeConfig, s: SafeRecord, entwurf: string) {
  const daten = await blobs.get(s.id);
  if (!daten) return null;
  return legeUploadAn(tenant, entwurf, daten, { typ: s.typ, seiten: s.seiten, sha256: s.sha256, name: decryptJson<string>(s.name), art: s.art, artSicher: true });
}
