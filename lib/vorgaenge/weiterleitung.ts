/**
 * Weiterleitung eingegangener Vorgänge an das zuständige Amt (laut Konfiguration).
 *
 *  backoffice → nichts weiter zu tun, der Vorgang erscheint im Backoffice
 *  email      → Benachrichtigung OHNE personenbezogene Daten und OHNE Anhänge
 *  fitconnect → FIT-Connect-Zustellpunkt (Ende-zu-Ende verschlüsselt, siehe lib/integrations/fitconnect.ts)
 *  webhook    → JSON mit Metadaten + kurzlebigen, signierten Dokument-Links,
 *               signiert mit HMAC-SHA256 (Header X-Signatur)
 *  webdav     → Ordner je Vorgang im DMS/in der E-Akte: antrag.pdf, vorgang.json, Unterlagen
 * Zusätzlich können Fachverfahren Vorgänge selbst abholen und den Stand zurückmelden
 * (app/api/schnittstelle).
 */
import "server-only";
import { createHmac } from "node:crypto";
import type { Amt, GemeindeConfig } from "@/config/types";
import { decryptJson } from "@/lib/crypto";
import { tx } from "@/lib/i18n";
import { sendMail } from "@/lib/mail";
import type { VorgangDaten, VorgangRecord } from "@/lib/records";
import { fitConnectKonfiguriert, uebermittle } from "@/lib/integrations/fitconnect";
import { signiere } from "@/lib/signatur";
import { blobs } from "@/lib/storage/blobs";
import { vorgangPdf } from "./pdf";

/** Gültigkeit externer Dokument-Links (Sekunden) */
export const EXTERN_LINK_SEKUNDEN = 15 * 60;

export function dokumentLink(basisUrl: string, v: VorgangRecord, dokumentId: string, benutzer: string, sekunden: number) {
  const token = signiere({ d: dokumentId, v: v.id, t: v.tenant, u: benutzer }, sekunden, "dokument");
  return `${basisUrl}/api/dokument/${token}`;
}

export async function leiteWeiter(tenant: GemeindeConfig, amt: Amt, v: VorgangRecord, basisUrl: string): Promise<boolean | { referenz: string }> {
  const w = amt.weiterleitung ?? { typ: "backoffice" };
  const leistung = tenant.leistungen.find((l) => l.id === v.leistungId);
  const titel = leistung ? tx(leistung.titel, "de") : "Sonstiges Anliegen";

  if (w.typ === "backoffice") return true;

  // FIT-Connect: Ende-zu-Ende verschlüsselt an den Zustellpunkt der Behörde
  if (w.typ === "fitconnect") {
    if (!fitConnectKonfiguriert()) throw new Error("FIT-Connect-Zugangsdaten fehlen (FIT_CONNECT_CLIENT_ID/SECRET)");
    return { referenz: await uebermittle(tenant, v, w.destinationId) };
  }

  if (w.typ === "email") {
    await sendMail(tenant, {
      to: w.adresse,
      subject: `Neuer Vorgang ${v.id}: ${titel}`,
      text: [
        `Im Bürgerservice-Portal ist ein neuer Vorgang für ${tx(amt.name, "de")} eingegangen.`,
        "",
        `Vorgangsnummer: ${v.id}`,
        `Vorgang: ${titel}`,
        `Unterlagen: ${v.dokumente.length}`,
        "",
        `Bearbeitung im Backoffice: ${basisUrl}/backoffice/vorgang/${v.id}`,
        "",
        "Aus Datenschutzgründen enthält diese E-Mail keine personenbezogenen Daten und keine Anhänge.",
      ].join("\n"),
    });
    return true;
  }

  if (w.typ === "webdav") return { referenz: await legeAb(tenant, w, v, titel) };

  // Webhook
  const geheimnis = process.env[w.secretEnv];
  if (!geheimnis) throw new Error(`Webhook-Geheimnis ${w.secretEnv} fehlt`);
  const d = decryptJson<VorgangDaten>(v.daten);
  const body = JSON.stringify({
    ereignis: "vorgang.eingegangen",
    gemeinde: tenant.slug,
    vorgang: {
      id: v.id,
      quelle: v.quelle,
      leistung: v.leistungId ?? null,
      leistungsschluessel: v.leistungsschluessel ?? null,
      amt: amt.id,
      eingegangenAm: v.erstelltAm,
      kontakt: d.kontakt,
      nachricht: d.nachricht ?? null,
      werte: d.werte ?? null,
      dokumente: v.dokumente.map((dok) => ({
        id: dok.id,
        art: dok.art,
        typ: dok.typ,
        groesse: dok.groesse,
        url: dokumentLink(basisUrl, v, dok.id, "extern", EXTERN_LINK_SEKUNDEN),
      })),
    },
  });
  const res = await fetch(w.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signatur": `sha256=${createHmac("sha256", geheimnis).update(body).digest("hex")}`,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Webhook antwortete mit ${res.status}`);
  return true;
}

/** WebDAV-Ablage: Ordner anlegen (MKCOL), Dateien hochladen (PUT). Gibt den Ordnerpfad zurück. */
async function legeAb(tenant: GemeindeConfig, w: { url: string; benutzerEnv: string; passwortEnv: string }, v: VorgangRecord, titel: string) {
  const benutzer = process.env[w.benutzerEnv];
  const passwort = process.env[w.passwortEnv];
  if (!benutzer || !passwort) throw new Error(`WebDAV-Zugangsdaten ${w.benutzerEnv}/${w.passwortEnv} fehlen`);
  const auth = `Basic ${Buffer.from(`${benutzer}:${passwort}`).toString("base64")}`;
  const ordner = `${w.url.replace(/\/$/, "")}/${encodeURIComponent(v.id)}`;
  const anfrage = async (url: string, method: string, body?: Buffer | string, typ?: string) => {
    const r = await fetch(url, { method, headers: { authorization: auth, ...(typ ? { "content-type": typ } : {}) }, body: body as BodyInit | undefined, signal: AbortSignal.timeout(20_000) });
    // 405 bei MKCOL = Ordner existiert schon
    if (!r.ok && !(method === "MKCOL" && r.status === 405)) throw new Error(`WebDAV ${method} ${r.status}`);
  };
  await anfrage(ordner, "MKCOL");
  await anfrage(`${ordner}/antrag.pdf`, "PUT", vorgangPdf(tenant, v), "application/pdf");
  const d = decryptJson<VorgangDaten>(v.daten);
  const meta = { vorgang: v.id, gemeinde: tenant.slug, titel, leistung: v.leistungId ?? null, leistungsschluessel: v.leistungsschluessel ?? null, amt: v.amtId, eingegangenAm: v.erstelltAm, kontakt: d.kontakt, fuer: d.fuer ?? null, werte: d.werte ?? null, nachricht: d.nachricht ?? null };
  await anfrage(`${ordner}/vorgang.json`, "PUT", JSON.stringify(meta, null, 2), "application/json");
  for (const [i, dok] of v.dokumente.entries()) {
    const daten = await blobs.get(dok.id);
    if (!daten) continue;
    const name = decryptJson<string>(dok.name).replace(/[^\w.\-äöüÄÖÜß ]/g, "_");
    await anfrage(`${ordner}/${String(i + 1).padStart(2, "0")}-${encodeURIComponent(name)}`, "PUT", daten, dok.typ);
  }
  return ordner.replace(/^https?:\/\/[^/]+/, "");
}
