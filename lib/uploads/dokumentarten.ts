/**
 * Standard-Dokumentarten, die der Assistent erkennt.
 * Gemeinden können in ihrer Konfiguration weitere ergänzen (`dokumentarten`).
 */
import type { Dokumentart, GemeindeConfig } from "@/config/types";

export const STANDARD_DOKUMENTARTEN: Dokumentart[] = [
  { id: "personalausweis", label: { de: "Personalausweis (Kopie)", en: "ID card (copy)" }, stichworte: ["personalausweis", "ausweis", "perso", "bundesrepublik deutschland personalausweis", "identity card", "id card"] },
  { id: "reisepass", label: { de: "Reisepass (Kopie)", en: "Passport (copy)" }, stichworte: ["reisepass", "passport", "pass"] },
  { id: "meldebescheinigung", label: { de: "Meldebescheinigung", en: "Certificate of registration" }, stichworte: ["meldebescheinigung", "meldebestätigung", "anmeldebestätigung", "aufenthaltsbescheinigung"] },
  { id: "wohnungsgeberbestaetigung", label: { de: "Wohnungsgeberbestätigung", en: "Landlord confirmation" }, stichworte: ["wohnungsgeberbestätigung", "wohnungsgeber", "vermieterbescheinigung", "einzugsbestätigung", "wohnungsgeberbescheinigung"] },
  { id: "geburtsurkunde", label: { de: "Geburtsurkunde", en: "Birth certificate" }, stichworte: ["geburtsurkunde", "geburtenregister", "birth certificate"] },
  { id: "eheurkunde", label: { de: "Eheurkunde", en: "Marriage certificate" }, stichworte: ["eheurkunde", "heiratsurkunde", "eheregister", "marriage certificate"] },
  { id: "scheidungsurteil", label: { de: "Scheidungsurteil", en: "Divorce decree" }, stichworte: ["scheidungsurteil", "scheidung", "familiengericht", "beschluss scheidung"] },
  { id: "bescheid", label: { de: "Brief vom Amt / Bescheid", en: "Letter from an authority" }, stichworte: ["bescheid", "steuerbescheid", "anhörung", "mahnung", "zahlungsaufforderung", "aktenzeichen", "rechtsbehelfsbelehrung", "sehr geehrte"] },
  { id: "antrag", label: { de: "Ausgefüllter Antrag / Formular", en: "Completed form" }, stichworte: ["antrag", "formular", "antragsteller", "unterschrift antragsteller"] },
  { id: "versicherungsnachweis", label: { de: "Versicherungsnachweis", en: "Proof of insurance" }, stichworte: ["versicherungsschein", "versicherungsnachweis", "police", "haftpflicht", "versicherungsbestätigung"] },
  { id: "schwerbehindertenausweis", label: { de: "Schwerbehindertenausweis", en: "Disability card" }, stichworte: ["schwerbehindertenausweis", "merkzeichen", "grad der behinderung"] },
  { id: "lichtbild", label: { de: "Passfoto", en: "Passport photo" }, stichworte: ["passfoto", "lichtbild", "biometrisch"] },
  { id: "vollmacht", label: { de: "Vollmacht", en: "Power of attorney" }, stichworte: ["vollmacht", "bevollmächtige", "bevollmächtigt"] },
  { id: "sonstiges", label: { de: "Sonstige Unterlage", en: "Other document" }, stichworte: [] },
];

export function dokumentarten(tenant: Pick<GemeindeConfig, "dokumentarten">): Dokumentart[] {
  const eigene = tenant.dokumentarten ?? [];
  const ids = new Set(eigene.map((d) => d.id));
  return [...eigene, ...STANDARD_DOKUMENTARTEN.filter((d) => !ids.has(d.id))];
}
