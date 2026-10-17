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
  if (aktiv(tenant, "fundbuero"))
    d.push({
      stichworte: ["fundbuero", "fundsache", "gefunden", "verloren", "liegen lassen", "liegengelassen", "schluessel verloren", "handy verloren", "rucksack verloren", "lost and found"],
      text: {
        de: "Im **Fundbüro** sehen Sie, was abgegeben wurde – mit Suche nach Stichwort und Kategorie. Ist Ihr Gegenstand dabei, melden Sie sich mit „Das gehört mir“.",
        en: "Search the **lost and found** for handed-in items.",
      },
      url: "/fundbuero",
      label: { de: "Zum Fundbüro", en: "Lost and found" },
    });
  if (aktiv(tenant, "ausweisStatus"))
    d.push({
      stichworte: ["ausweis abholen", "ausweis fertig", "ausweis abholbereit", "pass abholen", "pass fertig", "ausweis da", "abholbereit"],
      text: {
        de: "Ob Ihr Personalausweis oder Reisepass abholbereit ist, sehen Sie mit der Antragsnummer unter **Ist mein Ausweis da?**. Mit Bürgerkonto benachrichtigen wir Sie automatisch.",
        en: "Check whether your ID is ready under **Is my ID ready?**.",
      },
      url: "/ausweis-status",
      label: { de: "Status prüfen", en: "Check status" },
    });
  if (aktiv(tenant, "warteschlange"))
    d.push({
      stichworte: ["wartezeit", "wie lange warten", "wartenummer", "ohne termin", "spontan vorbeikommen", "warteschlange", "voll im rathaus"],
      text: {
        de: "Die aktuelle **Wartezeit** im Rathaus sehen Sie live. Während der Öffnungszeiten können Sie online eine Wartenummer ziehen und erst losgehen, wenn Sie bald dran sind.",
        en: "See live **waiting times** and take a number online.",
      },
      url: "/wartezeit",
      label: { de: "Wartezeit ansehen", en: "Waiting times" },
    });
  if (aktiv(tenant, "videoBeratung") && tenant.videoBeratung)
    d.push({
      stichworte: ["videoberatung", "video beratung", "videotermin", "videocall", "online beratung", "per video"],
      text: {
        de: "Für Beratungen bieten einige Stellen **Video-Termine** an. Wählen Sie bei der Terminbuchung „Per Video“ – teilnehmen können Sie im Browser, ohne Installation.",
        en: "Some offices offer **video appointments**. Choose “By video” when booking.",
      },
      url: "/termine",
      label: { de: "Termin buchen", en: "Book appointment" },
    });
  if (aktiv(tenant, "beteiligung"))
    d.push({
      stichworte: ["umfrage", "abstimmen", "abstimmung", "idee", "vorschlag", "verbesserungsvorschlag", "mitmachen", "beteiligung", "buergerbeteiligung", "meinung sagen"],
      text: {
        de: "Unter **Mitmachen** können Sie an Umfragen teilnehmen und eigene Ideen für die Stadt einreichen oder unterstützen. Dafür brauchen Sie ein Bürgerkonto – so zählt jede Stimme nur einmal.",
        en: "Under **Get involved** you can vote in surveys and submit or support ideas.",
      },
      url: "/beteiligung",
      label: { de: "Mitmachen", en: "Get involved" },
    });
  if (aktiv(tenant, "ratsinfo") && tenant.ratsinfo)
    d.push({
      stichworte: ["stadtrat", "gemeinderat", "ratssitzung", "sitzung", "tagesordnung", "beschluss", "ausschuss", "ratsinformation"],
      text: {
        de: "Wann der Rat tagt, die **Tagesordnungen** und die **Beschlüsse** finden Sie unter „Rat und Ausschüsse“. Die Sitzungen sind öffentlich.",
        en: "Council meetings, agendas and decisions are listed under **Council**.",
      },
      url: "/ratsinfo",
      label: { de: "Rat und Ausschüsse", en: "Council" },
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

/** Passender Portal-Dienst zur Anfrage – oder undefined. `mehrwort`: Treffer über eine Wortgruppe (sehr eindeutig). */
export function dienstAntwort(tenant: GemeindeConfig, text: string, lang: Sprache): (Antwort & { mehrwort: boolean }) | undefined {
  const n = normalisiere(text);
  const alle = new Set(tokens(text, true));
  let beste: { d: Dienst; score: number } | undefined;
  for (const d of dienste(tenant)) {
    const score = d.stichworte.filter((s) => enthaeltPhrase(alle, n, s)).reduce((s, w) => s + tokens(w, true).length ** 2 * 2 + 1, 0);
    if (score > 0 && (!beste || score > beste.score)) beste = { d, score };
  }
  if (!beste) return undefined;
  const l = lang === "de" ? "de" : "en";
  return { text: beste.d.text[l], aktionen: [{ typ: "link", url: beste.d.url, label: beste.d.label[l] }], quellen: [], sicher: true, mehrwort: beste.score >= 9 };
}
