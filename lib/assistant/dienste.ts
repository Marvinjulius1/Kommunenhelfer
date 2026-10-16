/**
 * Portal-Dienste, die keine Verwaltungsleistung im engeren Sinn sind
 * (Abfallkalender, Mängelmelder, Lebenslagen, Bürgerkonto …).
 * Der Assistent verweist darauf deterministisch – ohne Sprachmodell.
 */
import "server-only";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { enthaeltPhrase, normalisiere, tokens } from "./text";
import type { Antwort } from "./types";

interface Dienst {
  stichworte: string[];
  text: { de: string; en: string };
  url: string;
  label: { de: string; en: string };
}

function dienste(tenant: GemeindeConfig): Dienst[] {
  const d: Dienst[] = [];
  if (aktiv(tenant, "maengelmelder") && tenant.maengel)
    d.push({
      stichworte: ["schlagloch", "laterne", "strassenlaterne", "strassenbeleuchtung", "mangel melden", "maengelmelder", "wilder muell", "muell abgeladen", "strassenschaden", "spielplatz kaputt", "ampel kaputt", "schild kaputt", "defekt melden"],
      text: {
        de: "Das können Sie direkt im **Mängelmelder** melden – mit Foto und Standort, in etwa einer Minute. Die Meldung geht an die zuständige Stelle, und Sie können den Stand verfolgen.",
        en: "You can report this in the **issue reporter** – with photo and location, in about a minute.",
      },
      url: "/maengel/melden",
      label: { de: "Mangel melden", en: "Report an issue" },
    });
  if (aktiv(tenant, "abfall") && tenant.abfall)
    d.push({
      stichworte: ["muellabfuhr", "abfuhr", "abfallkalender", "muellkalender", "gelber sack", "gelbe sack", "biotonne", "restmuell", "altpapier", "papiertonne", "wann wird abgeholt", "tonne abgeholt"],
      text: {
        de: "Im **Abfallkalender** sehen Sie nach Eingabe Ihrer Straße alle Abfuhrtermine. Sie können sie in Ihren Kalender übernehmen oder sich am Vorabend erinnern lassen.",
        en: "The **waste calendar** shows all collection dates for your street. You can add them to your calendar or get a reminder the evening before.",
      },
      url: "/abfall",
      label: { de: "Zum Abfallkalender", en: "Open waste calendar" },
    });
  d.push({
    stichworte: ["strassensperrung", "sperrung", "gesperrt", "umleitung", "baustelle", "stoerung", "aktuelles", "neuigkeiten", "wasserrohrbruch"],
    text: { de: "Aktuelle Sperrungen, Störungen und Hinweise der Verwaltung finden Sie unter **Aktuelles**.", en: "Current closures and notices are listed under **News**." },
    url: "/aktuelles",
    label: { de: "Aktuelles ansehen", en: "View news" },
  });
  if (aktiv(tenant, "konto"))
    d.push({
      stichworte: ["buergerkonto", "konto erstellen", "mein konto", "postfach", "dokumentensafe", "registrieren", "bescheid digital"],
      text: {
        de: "Mit dem **Bürgerkonto** sehen Sie alle Anliegen auf jedem Gerät, erhalten Bescheide digital ins Postfach, bezahlen Gebühren online und Formulare werden automatisch ausgefüllt. Anmeldung mit E-Mail oder Online-Ausweis.",
        en: "With a **citizen account** you see all requests on every device, receive decisions digitally, pay fees online and forms are filled in automatically.",
      },
      url: "/konto",
      label: { de: "Zum Bürgerkonto", en: "Open account" },
    });
  if (aktiv(tenant, "zahlung"))
    d.push({
      stichworte: ["online bezahlen", "gebuehr bezahlen", "rechnung bezahlen", "zahlung offen", "quittung"],
      text: {
        de: "Offene Gebühren bezahlen Sie unter **Meine Anliegen** oder in Ihrem Bürgerkonto unter **Zahlungen** – per Karte, PayPal, Apple/Google Pay, Wero oder Lastschrift.",
        en: "Pay open fees under **My requests** or in your account under **Payments**.",
      },
      url: "/meine-anliegen",
      label: { de: "Zu meinen Anliegen", en: "My requests" },
    });
  if (aktiv(tenant, "lebenslagen"))
    for (const l of tenant.lebenslagen ?? [])
      d.push({
        stichworte: l.stichworte,
        text: {
          de: `Für „${tx(l.titel, "de")}“ gibt es eine **Checkliste** mit allen Schritten über alle Ämter hinweg – in der richtigen Reihenfolge und mit Fristen. ${tx(l.kurz, "de")}`,
          en: `There is a **checklist** for "${tx(l.titel, "en")}" with all steps and deadlines.`,
        },
        url: `/lebenslagen/${l.id}`,
        label: { de: "Zur Checkliste", en: "Open checklist" },
      });
  return d;
}

/** Passender Portal-Dienst zur Anfrage – oder undefined. */
export function dienstAntwort(tenant: GemeindeConfig, text: string, lang: Sprache): Antwort | undefined {
  const n = normalisiere(text);
  const alle = new Set(tokens(text, true));
  let beste: { d: Dienst; score: number } | undefined;
  for (const d of dienste(tenant)) {
    const score = d.stichworte.filter((s) => enthaeltPhrase(alle, n, s)).reduce((s, w) => s + tokens(w, true).length ** 2 * 2 + 1, 0);
    if (score > 0 && (!beste || score > beste.score)) beste = { d, score };
  }
  if (!beste) return undefined;
  const l = lang === "de" ? "de" : "en";
  return { text: beste.d.text[l], aktionen: [{ typ: "link", url: beste.d.url, label: beste.d.label[l] }], quellen: [], sicher: true };
}
