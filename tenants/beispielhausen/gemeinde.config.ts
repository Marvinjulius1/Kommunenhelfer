/**
 * Konfiguration: Gemeinde Beispielhausen
 *
 * Zweite, bewusst kleine Beispiel-Gemeinde. Sie zeigt, dass eine Gemeinde
 * nur die Leistungen anbieten muss, die sie wirklich hat – und dass eine
 * eigene Farbe, ein eigenes Wappen und eigene Texte genügen.
 * Alle Werte sind frei erfunden.
 */
import { defineGemeinde } from "@/config/define";

export default defineGemeinde({
  slug: "beispielhausen",
  name: "Beispielhausen",
  art: "Gemeinde",
  wappen: "/tenants/beispielhausen/wappen.svg",
  wappenAlt: "Wappen der Gemeinde Beispielhausen: ein goldener Baum auf grünem Schild",
  akzentfarbe: "#2B6E37",
  akzentfarbeDunkel: "#7BCB8A",
  sprachen: ["de"],
  standardSprache: "de",
  texte: {
    platzhalter: "Was möchten Sie erledigen?",
    begruessung: "Guten Tag. Was möchten Sie erledigen?",
  },
  kontakt: {
    bezeichnung: "Gemeindeverwaltung Beispielhausen",
    strasse: "Lindenweg 3",
    plz: "54321",
    ort: "Beispielhausen",
    telefon: "+49 5432 100-0",
    email: "rathaus@beispielhausen.example",
  },
  oeffnungszeiten: {
    di: [["08:00", "12:00"]],
    do: [["14:00", "18:00"]],
  },
  schliesstage: [],
  rechtliches: {
    impressumUrl: "https://www.beispielhausen.example/impressum",
    datenschutzUrl: "https://www.beispielhausen.example/datenschutz",
    verantwortlich: "Gemeinde Beispielhausen, Lindenweg 3, 54321 Beispielhausen",
    datenschutzbeauftragter: "datenschutz@beispielhausen.example",
    barrierefreiheitKontakt: "rathaus@beispielhausen.example",
  },
  aemter: [
    {
      id: "rathaus",
      name: "Rathaus",
      ort: "Lindenweg 3, Erdgeschoss",
      zustaendigkeiten: ["meldewesen", "ausweis", "hundesteuer", "standesamt"],
      weiterleitung: { typ: "backoffice" },
      termine: {
        zeiten: { di: [["08:00", "12:00"]], do: [["14:00", "18:00"]] },
        slotMinuten: 20,
        parallel: 1,
        vorlaufTage: 1,
        buchbarTage: 28,
      },
    },
  ],
  uploads: {
    aktiv: true,
    maxDateiMB: 8,
    maxGesamtMB: 24,
    maxDateien: 6,
    aufbewahrungTage: 60,
    standardAmtId: "rathaus",
  },
  leistungen: [
    {
      id: "wohnsitz-anmelden",
      aktiv: true,
      titel: "Wohnsitz anmelden",
      kurz: "Nach dem Umzug nach Beispielhausen melden Sie sich innerhalb von zwei Wochen im Rathaus an.",
      stichworte: ["umzug", "umziehen", "anmelden", "wohnsitz", "zuzug", "ummelden"],
      unterlagen: ["Personalausweis oder Reisepass", "Wohnungsgeberbestätigung"],
      gebuehren: [{ bezeichnung: "Anmeldung", betrag: null }],
      ablauf: ["Termin buchen", "Unterlagen mitbringen", "Meldebestätigung erhalten"],
      fristen: ["Innerhalb von 2 Wochen nach dem Einzug (§ 17 Bundesmeldegesetz)."],
      amtId: "rathaus",
      online: false,
      termin: true,
    },
    {
      id: "personalausweis",
      aktiv: true,
      titel: "Personalausweis beantragen",
      kurz: "Den Personalausweis beantragen Sie persönlich im Rathaus.",
      stichworte: ["personalausweis", "ausweis", "perso"],
      unterlagen: ["Biometrisches Passfoto", "Bisheriger Ausweis"],
      gebuehren: [
        { bezeichnung: "ab 24 Jahren", betrag: 46 },
        { bezeichnung: "unter 24 Jahren", betrag: 27.6 },
      ],
      ablauf: ["Termin buchen", "Antrag im Rathaus stellen", "Ausweis nach ca. 4 Wochen abholen"],
      amtId: "rathaus",
      online: false,
      termin: true,
    },
    {
      id: "hund-anmelden",
      // Beispielhausen bietet die Hundeanmeldung (noch) nicht online an:
      aktiv: false,
      titel: "Hund anmelden",
      kurz: "",
      stichworte: [],
      unterlagen: [],
      gebuehren: [],
      ablauf: [],
      online: false,
      termin: false,
    },
  ],
  rueckfragen: [],
  faq: [],
  email: { absenderName: "Gemeinde Beispielhausen", absenderAdresse: "no-reply@beispielhausen.example" },
});
