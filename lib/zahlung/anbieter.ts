/**
 * Zahlungsanbieter – austauschbar.
 *
 *  demo   Testzahlung im Portal (kein Geld fließt). Nur im DEMO_MODUS.
 *  epaybl ePayBL, die Bezahlplattform von Bund und Ländern (Kreditkarte,
 *         PayPal, Lastschrift, giropay/Wero …). Anbindung über die
 *         Schnittstelle des jeweiligen Landes – Zugangsdaten stellt die
 *         Gemeinde bzw. ihr IT-Dienstleister bereit (siehe README).
 */
import "server-only";
import { demoModus } from "@/lib/demo";
import type { ZahlungRecord } from "@/lib/records";

export interface ZahlungsAnbieter {
  id: string;
  /** Liefert die Adresse, zu der der Bürger zum Bezahlen geleitet wird. */
  starte(z: ZahlungRecord, rueckUrl: string, zugang: string): Promise<{ url: string }>;
}

const demo: ZahlungsAnbieter = {
  id: "demo",
  async starte(z, _rueck, zugang) {
    return { url: `/bezahlen/${z.id}?t=${encodeURIComponent(zugang)}` };
  },
};

const epaybl: ZahlungsAnbieter = {
  id: "epaybl",
  async starte() {
    // Hier wird die ePayBL-Bezahlseite des Landes angefragt (SOAP/REST je nach Land).
    throw new Error("ePayBL ist für diese Gemeinde noch nicht eingerichtet (EPAYBL_* Umgebungsvariablen).");
  },
};

export function zahlungsAnbieter(): ZahlungsAnbieter | null {
  const wahl = process.env.ZAHLUNG_ANBIETER ?? (demoModus() ? "demo" : "");
  if (wahl === "demo" && demoModus()) return demo;
  if (wahl === "epaybl") return epaybl;
  return null;
}
