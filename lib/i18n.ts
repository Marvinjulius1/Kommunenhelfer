/**
 * Mehrsprachigkeit: Oberflächentexte (UI-Chrome) + Hilfsfunktion für
 * übersetzbare Konfigurationstexte (LText).
 */
import type { GemeindeConfig, LText, Sprache } from "@/config/types";

export function tx(text: LText | undefined, lang: Sprache): string {
  if (text === undefined) return "";
  if (typeof text === "string") return text;
  return text[lang] ?? text.de;
}

/** Schrift unter dem Wappen. Standard: "Bürgerservice online". */
export function untertitel(tenant: Pick<GemeindeConfig, "texte">, lang: Sprache): string {
  return tx(tenant.texte.untertitel ?? { de: "Bürgerservice online", en: "Online citizen services" }, lang);
}

const de = {
  menuDienste: "Dienste",
  menuTermine: "Termine",
  menuHilfe: "Hilfe",
  menuKontakt: "Kontakt",
  menuAnliegen: "Meine Anliegen",
  menuOeffnen: "Menü öffnen",
  menuSchliessen: "Menü schließen",
  themeWechseln: "Erscheinungsbild wechseln",
  senden: "Absenden",
  eingabeLabel: "Ihr Anliegen",
  alleLeistungen: "Alle Leistungen von A bis Z",
  neuesAnliegen: "Neues Anliegen",
  einenMoment: "Einen Moment bitte …",
  sie: "Sie",
  fehlerAllgemein: "Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.",
  zuVieleAnfragen: "Sie haben sehr viele Anfragen gesendet. Bitte warten Sie einen Moment.",
  impressum: "Impressum",
  datenschutz: "Datenschutz",
  barrierefreiheit: "Barrierefreiheit",
  zurueck: "Zurück",
  weiter: "Weiter",
  startseite: "Zur Startseite",
  quelle: "Quelle",
  onlineBeantragen: "Online beantragen",
  terminBuchen: "Termin buchen",
  kontaktAufnehmen: "Kontakt aufnehmen",
  unterlagen: "Das brauchen Sie",
  gebuehren: "Gebühren",
  ablauf: "So geht es",
  fristen: "Fristen",
  kostenfrei: "kostenfrei",
  dauer: "Dauer",
  oeffnungszeiten: "Öffnungszeiten",
  geschlossen: "geschlossen",
  hauptinhalt: "Zum Hauptinhalt springen",
};

export type Dict = typeof de;

const en: Dict = {
  menuDienste: "Services",
  menuTermine: "Appointments",
  menuHilfe: "Help",
  menuKontakt: "Contact",
  menuAnliegen: "My requests",
  menuOeffnen: "Open menu",
  menuSchliessen: "Close menu",
  themeWechseln: "Change appearance",
  senden: "Send",
  eingabeLabel: "Your request",
  alleLeistungen: "All services from A to Z",
  neuesAnliegen: "New request",
  einenMoment: "One moment please …",
  sie: "You",
  fehlerAllgemein: "Unfortunately that did not work. Please try again.",
  zuVieleAnfragen: "You have sent many requests. Please wait a moment.",
  impressum: "Legal notice",
  datenschutz: "Privacy",
  barrierefreiheit: "Accessibility",
  zurueck: "Back",
  weiter: "Continue",
  startseite: "Back to start",
  quelle: "Source",
  onlineBeantragen: "Apply online",
  terminBuchen: "Book an appointment",
  kontaktAufnehmen: "Contact us",
  unterlagen: "What you need",
  gebuehren: "Fees",
  ablauf: "How it works",
  fristen: "Deadlines",
  kostenfrei: "free of charge",
  dauer: "Duration",
  oeffnungszeiten: "Opening hours",
  geschlossen: "closed",
  hauptinhalt: "Skip to main content",
};

const dicts: Record<Sprache, Dict> = { de, en };

export function dict(lang: Sprache): Dict {
  return dicts[lang] ?? de;
}

export const WOCHENTAGE: Record<Sprache, Record<string, string>> = {
  de: { mo: "Montag", di: "Dienstag", mi: "Mittwoch", do: "Donnerstag", fr: "Freitag", sa: "Samstag", so: "Sonntag" },
  en: { mo: "Monday", di: "Tuesday", mi: "Wednesday", do: "Thursday", fr: "Friday", sa: "Saturday", so: "Sunday" },
};

export function formatEuro(betrag: number, lang: Sprache = "de"): string {
  return new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(betrag);
}
