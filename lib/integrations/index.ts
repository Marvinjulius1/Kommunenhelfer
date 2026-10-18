/**
 * Schnittstellen für spätere Anbindungen an die deutsche
 * Verwaltungsinfrastruktur. Die Anwendung spricht nur mit diesen
 * Interfaces – konkrete Anbindungen werden pro Gemeinde ausgetauscht.
 *
 *  - IdentityProvider:  BundID / Nutzerkonto Bund (SAML 2.0 bzw. OIDC),
 *                       Online-Ausweisfunktion (eID), Landeskonten
 *  - SubmissionGateway: Übermittlung von Anträgen, z. B. über FIT-Connect
 *                       (XÖV-Standards wie XMeld, XPersonenstand, XFall)
 *                       oder direkt an ein Fachverfahren
 */
import "server-only";
import type { GemeindeConfig, Leistung } from "@/config/types";
import { localGateway } from "./local-gateway";

/** Identität aus einem Servicekonto (z. B. BundID). */
export interface Identitaet {
  vorname: string;
  nachname: string;
  geburtsdatum?: string;
  anschrift?: { strasse: string; plz: string; ort: string };
  email?: string;
  /** eIDAS-Vertrauensniveau: "niedrig" | "substantiell" | "hoch" */
  vertrauensniveau: "niedrig" | "substantiell" | "hoch";
}

export interface IdentityProvider {
  id: string;
  /** URL, zu der für die Anmeldung weitergeleitet wird. */
  loginUrl(returnTo: string): Promise<string>;
  /** Verarbeitet die Rückmeldung (SAML-Response / OIDC-Code). */
  callback(params: URLSearchParams): Promise<Identitaet>;
}

export interface AntragEinreichung {
  tenant: GemeindeConfig;
  leistung: Leistung;
  /** Validierte, bereinigte Formulardaten. */
  daten: Record<string, string>;
  /** Optional: Identität aus dem Servicekonto. */
  identitaet?: Identitaet;
  /** Öffentliche Basis-URL des Portals (für Links in Benachrichtigungen) */
  basisUrl: string;
  kontoId?: string;
  /** Mit dem Antrag hochgeladene Unterlagen */
  dokumente?: import("@/lib/records").DokumentMeta[];
  /** Für wen der Antrag gestellt wurde (Kind, Vollmacht, Unternehmen) */
  fuer?: string;
  /** Konto der bevollmächtigten Person, falls jemand im fremden Namen handelt */
  vertreterKontoId?: string;
}

export interface EinreichungsErgebnis {
  vorgangsnummer: string;
  /** Geheimer Code für die Statusabfrage ("Meine Anliegen"). */
  zugangscode: string;
}

export interface SubmissionGateway {
  id: string;
  einreichen(antrag: AntragEinreichung): Promise<EinreichungsErgebnis>;
}

/**
 * Wählt das Übermittlungsverfahren. Der Antrag wird immer zuerst im Portal gespeichert
 * (Nachvollziehbarkeit, Status für Bürger); die Zustellung an Fachverfahren erfolgt pro Amt
 * über `weiterleitung` – auch per FIT-Connect (siehe lib/integrations/fitconnect.ts).
 */
export function gatewayFuer(_leistung: Leistung): SubmissionGateway {
  return localGateway;
}
