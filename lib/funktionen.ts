/** Ist eine Portal-Funktion für diese Gemeinde aktiv? (gemeinsam für Server und Browser) */
import type { Funktionen, GemeindeConfig, Paket } from "@/config/types";

export const STANDARD_FUNKTIONEN: Funktionen = {
  konto: true,
  onlineAusweis: true,
  zahlung: true,
  maengelmelder: true,
  abfall: true,
  lebenslagen: true,
  beteiligung: true,
  ratsinfo: true,
  warteschlange: true,
  videoBeratung: true,
  fundbuero: true,
  ausweisStatus: true,
  push: true,
  vorlesen: true,
  spracheingabe: false,
  hinweise: true,
  sms: true,
  whatsapp: false,
  feedback: true,
  kita: true,
  veranstaltungen: true,
  ehrenamt: true,
  buergerhaushalt: true,
  parken: true,
  friedhof: true,
  karte: true,
  warnungen: true,
  kiEntwurf: true,
  formularBaukasten: true,
  wirkungsbericht: true,
  auslastung: true,
};

const BASIS: (keyof Funktionen)[] = ["konto", "onlineAusweis", "zahlung", "maengelmelder", "abfall", "push", "vorlesen", "spracheingabe", "hinweise", "feedback", "warnungen", "ausweisStatus"];
const KOMFORT: (keyof Funktionen)[] = [...BASIS, "lebenslagen", "warteschlange", "fundbuero", "videoBeratung", "sms", "veranstaltungen", "karte", "parken", "friedhof", "wirkungsbericht", "auslastung"];
const PREMIUM: (keyof Funktionen)[] = [...KOMFORT, "beteiligung", "buergerhaushalt", "ratsinfo", "kita", "ehrenamt", "whatsapp", "kiEntwurf", "formularBaukasten"];

/**
 * Pakete für den Vertrieb. Preise sind Beispielwerte (netto pro Jahr) und lassen sich
 * hier zentral anpassen. Eine Gemeinde ohne `paket` erhält alle Standardfunktionen.
 */
export const PAKETE: Record<Paket, { name: string; beschreibung: string; grundpreisEuro: number; jeEinwohnerCent: number; funktionen: (keyof Funktionen)[] }> = {
  basis: { name: "Basis", beschreibung: "Assistent, Online-Anträge, Bürgerkonto, Bezahlen, Abfall, Mängelmelder", grundpreisEuro: 2400, jeEinwohnerCent: 20, funktionen: BASIS },
  komfort: { name: "Komfort", beschreibung: "Basis + Lebenslagen, Wartezeit, Fundbüro, Video-Beratung, SMS, Veranstaltungen, Karte, Parken, Friedhof, Wirkungsbericht, Auslastung", grundpreisEuro: 4800, jeEinwohnerCent: 35, funktionen: KOMFORT },
  premium: { name: "Premium", beschreibung: "Komfort + Beteiligung, Bürgerhaushalt, Ratsinfo, Kita-Börse, Ehrenamt, KI-Entwürfe, Formular-Baukasten", grundpreisEuro: 8400, jeEinwohnerCent: 50, funktionen: PREMIUM },
};

/** Jahrespreis netto in Euro – Grundpreis plus Einwohner × Satz. */
export function jahrespreis(paket: Paket, einwohner = 0) {
  const p = PAKETE[paket];
  return p.grundpreisEuro + Math.round((einwohner * p.jeEinwohnerCent) / 100);
}

export function aktiv(tenant: Pick<GemeindeConfig, "funktionen" | "paket">, f: keyof Funktionen): boolean {
  const gesetzt = tenant.funktionen?.[f];
  if (gesetzt !== undefined) return gesetzt;
  if (tenant.paket && !PAKETE[tenant.paket].funktionen.includes(f)) return false;
  return STANDARD_FUNKTIONEN[f];
}
