/**
 * Mängelmelder: Bürger melden Schlaglöcher, defekte Laternen, wilde Müllablagerungen …
 * Jede Meldung ist ein Vorgang (quelle "mangel") beim zuständigen Amt.
 * Öffentlich sichtbar sind nur Kategorie, Ort (gerundet) und Status – nie Beschreibung,
 * Foto oder Kontaktdaten.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { encryptJson } from "@/lib/crypto";
import { tx } from "@/lib/i18n";
import type { DokumentMeta, VorgangRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { zaehle } from "@/lib/statistik";
import { store } from "@/lib/storage/store";
import { bereinigeDateiname } from "@/lib/uploads/formate";
import { pruefeDatei, type UploadFehler } from "@/lib/uploads/service";
import type { Dateityp } from "@/lib/uploads/formate";
import { erstelleVorgang, STATUS_LABEL } from "@/lib/vorgaenge/service";
import { ohneMetadaten } from "./exif";

export const MANGEL_AUFBEWAHRUNG_TAGE = 180;

export interface NeuerMangel {
  kategorie: string;
  beschreibung: string;
  ort: string;
  lat?: number;
  lng?: number;
  name?: string;
  email?: string;
  foto?: Buffer;
}

/** Entfernung in Metern (Haversine) */
export function abstand(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = 6371e3;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export async function meldeMangel(
  tenant: GemeindeConfig,
  m: NeuerMangel,
  opt: { kontoId?: string; basisUrl: string },
): Promise<{ ok: true; vorgangsnummer: string; zugangscode: string; amt: string } | { ok: false; fehler: UploadFehler | "kategorie" }> {
  const kat = tenant.maengel?.kategorien.find((k) => k.id === m.kategorie);
  if (!kat) return { ok: false, fehler: "kategorie" };

  const dokumente: DokumentMeta[] = [];
  if (m.foto?.length) {
    const p = await pruefeDatei(m.foto, tenant.uploads.maxDateiMB, ["image/jpeg", "image/png"]);
    if (!p.ok) return p;
    const sauber = ohneMetadaten(m.foto, p.datei.typ);
    if (!sauber) return { ok: false, fehler: "format" };
    const id = randomBytes(18).toString("base64url");
    await blobs.put(id, sauber);
    dokumente.push({ id, art: "foto", typ: p.datei.typ, groesse: sauber.length, name: encryptJson(bereinigeDateiname(`mangel-${kat.id}`, p.datei.typ as Dateityp)) });
  }

  const r = await erstelleVorgang({
    tenant,
    quelle: "mangel",
    amtId: kat.amtId,
    daten: { kontakt: { name: m.name ?? "", email: m.email ?? "" }, nachricht: m.beschreibung },
    dokumente,
    aufbewahrungTage: MANGEL_AUFBEWAHRUNG_TAGE,
    basisUrl: opt.basisUrl,
    kontoId: opt.kontoId,
    mangel: { kategorie: kat.id, ort: m.ort, lat: m.lat, lng: m.lng, fotoId: dokumente[0]?.id },
  });
  await zaehle(tenant.slug, "maengel");
  const amt = tenant.aemter.find((a) => a.id === kat.amtId)!;
  return { ok: true, ...r, amt: tx(amt.name, "de") };
}

export interface MangelOeffentlich {
  id: string;
  kategorie: string;
  kategorieLabel: string;
  ort: string;
  lat?: number;
  lng?: number;
  status: VorgangRecord["status"];
  statusLabel: string;
  gemeldetAm: string;
  erledigtAm?: string;
}

const runde = (x: number | undefined) => (x === undefined ? undefined : Math.round(x * 1000) / 1000);

/** Öffentliche Liste: offene Meldungen und in den letzten 30 Tagen erledigte. */
export async function oeffentlicheMaengel(tenant: GemeindeConfig, lang: "de" | "en" = "de"): Promise<MangelOeffentlich[]> {
  const grenze = new Date(Date.now() - 30 * 86400_000).toISOString();
  const liste = await store().list<VorgangRecord>("vorgaenge", (v) => v.tenant === tenant.slug && v.quelle === "mangel" && !!v.mangel);
  return liste
    .map((v) => {
      const erledigt = v.status === "erledigt" ? v.verlauf.findLast((x) => x.status === "erledigt")?.am : undefined;
      const kat = tenant.maengel?.kategorien.find((k) => k.id === v.mangel!.kategorie);
      return {
        // Öffentliche Kennung ohne Rückschluss auf die Vorgangsnummer
        id: v.tokenHash.slice(0, 10),
        kategorie: v.mangel!.kategorie,
        kategorieLabel: kat ? tx(kat.label, lang) : v.mangel!.kategorie,
        ort: v.mangel!.ort,
        lat: runde(v.mangel!.lat),
        lng: runde(v.mangel!.lng),
        status: v.status,
        statusLabel: STATUS_LABEL[v.status],
        gemeldetAm: v.erstelltAm,
        erledigtAm: erledigt,
      };
    })
    .filter((m) => !m.erledigtAm || m.erledigtAm >= grenze)
    .sort((a, b) => b.gemeldetAm.localeCompare(a.gemeldetAm));
}

/** Offene Meldungen derselben Kategorie in der Nähe (Doppelmeldungen vermeiden). */
export async function maengelInDerNaehe(tenant: GemeindeConfig, kategorie: string, pos: { lat: number; lng: number }, radius = 75): Promise<number> {
  const offen = await store().list<VorgangRecord>(
    "vorgaenge",
    (v) => v.tenant === tenant.slug && v.quelle === "mangel" && v.status !== "erledigt" && v.mangel?.kategorie === kategorie && v.mangel.lat !== undefined && v.mangel.lng !== undefined,
  );
  return offen.filter((v) => abstand(pos, { lat: v.mangel!.lat!, lng: v.mangel!.lng! }) <= radius).length;
}
