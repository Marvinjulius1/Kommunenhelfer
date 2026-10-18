/**
 * Briefwahl: Fristen und der Online-Antrag auf Wahlschein. Ohne Speicherzugriff –
 * so lässt sich alles direkt testen.
 */
import type { Feld, GemeindeConfig, Leistung, Wahl } from "@/config/types";

/** Zeitpunkt in deutscher Ortszeit (Sommer-/Winterzeit) als Date. */
export function berlinZeit(datum: string, uhrzeit: string): Date {
  const naiv = new Date(`${datum}T${uhrzeit}:00Z`);
  const t = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(naiv)
      .map((p) => [p.type, p.value]),
  );
  const alsBerlin = Date.UTC(+t.year, +t.month - 1, +t.day, +t.hour, +t.minute);
  return new Date(naiv.getTime() - (alsBerlin - naiv.getTime()));
}

/** Antragsschluss: zweiter Tag vor der Wahl, 18 Uhr – sonst der eingetragene Zeitpunkt. */
export function antragsschluss(w: Wahl): Date {
  if (w.antragBis) return new Date(w.antragBis);
  const d = new Date(`${w.datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 2);
  return berlinZeit(d.toISOString().slice(0, 10), "18:00");
}

export const offen = (w: Wahl, jetzt = new Date()) => jetzt < antragsschluss(w);

const fmtDatum = (iso: string) => new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(`${iso}T12:00:00Z`));
export const fmtSchluss = (d: Date) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(d) + " Uhr";
export const wahlLabel = (w: Wahl) => `${w.titel} am ${fmtDatum(w.datum)}`;

/** Normalisierter Schlüssel für die Doppelantrags-Prüfung (Groß-/Kleinschreibung, Umlaute, Leerzeichen egal). */
export function personSchluessel(wahlId: string, w: Record<string, string>) {
  const n = (s = "") =>
    s
      .normalize("NFC")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");
  return [wahlId, n(w.nachname), n(w.vorname), w.geburtsdatum ?? ""].join("|");
}

export const BRIEFWAHL_ID = "briefwahl";

/** Die Leistung „Briefwahl beantragen“ – online nur, solange eine Wahl offen ist. */
export function briefwahlLeistung(tenant: GemeindeConfig, offene: Wahl[]): Leistung {
  const amt = tenant.aemter.find((a) => a.zustaendigkeiten?.includes("wahlen")) ?? tenant.aemter.find((a) => a.id === tenant.uploads.standardAmtId);
  const ort = tenant.kontakt.ort;
  const anschrift: Feld[] = [
    { id: "strasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, autocomplete: "street-address", maxLaenge: 120 },
    { id: "plz", typ: "plz", label: "Postleitzahl", pflicht: true, autocomplete: "postal-code", halb: true },
    { id: "ort", typ: "text", label: "Ort", pflicht: true, autocomplete: "address-level2", standard: ort, halb: true, maxLaenge: 80 },
  ];
  const andere = { feld: "versand", gleich: "andere" };
  const naechste = offene[0];
  return {
    id: BRIEFWAHL_ID,
    aktiv: true,
    titel: { de: "Briefwahl beantragen", en: "Apply for postal vote" },
    kurz: naechste
      ? `Wahlschein und Briefwahlunterlagen für die ${wahlLabel(naechste)} online beantragen – bis ${fmtSchluss(antragsschluss(naechste))}.`
      : "Wahlschein und Briefwahlunterlagen online beantragen, sobald eine Wahl ansteht.",
    beschreibung: "Mit der Briefwahl wählen Sie zu Hause. Den Antrag kann nur die wahlberechtigte Person selbst stellen; für andere Personen ist eine schriftliche Vollmacht im Wahlamt nötig. Ein telefonischer Antrag ist nicht möglich.",
    stichworte: ["briefwahl", "wahlschein", "briefwahlunterlagen", "per post wählen", "wahl", "wählen", "am wahltag nicht da", "wahlbenachrichtigung", "postal vote"],
    unterlagen: ["Keine – die Angaben auf der Wahlbenachrichtigung helfen aber (Wählerverzeichnis-Nummer)."],
    gebuehren: [{ bezeichnung: "Wahlschein und Briefwahlunterlagen", betrag: null }],
    ablauf: [
      "Sie stellen den Antrag online und erhalten eine Eingangsbestätigung.",
      "Das Wahlamt prüft Ihre Eintragung im Wählerverzeichnis.",
      "Sie erhalten Wahlschein, Stimmzettel und Umschläge per Post – oder holen sie im Wahlamt ab.",
      "Stimmzettel ausfüllen und den Wahlbrief rechtzeitig zurücksenden: Er muss am Wahltag bis 18 Uhr beim Wahlamt sein.",
    ],
    fristen: naechste ? [`Antrag bis ${fmtSchluss(antragsschluss(naechste))}.`, "Der Wahlbrief muss am Wahltag bis 18 Uhr eingegangen sein – innerhalb Deutschlands spätestens am dritten Werktag vor der Wahl absenden."] : undefined,
    amtId: amt?.id,
    online: offene.length > 0,
    termin: false,
    rechtsgrundlage: "§ 27 Bundeswahlordnung und die Wahlordnungen der Länder",
    // Gehört dem Wahlamt, nicht dem Bürger – nach der Wahl löschen
    aufbewahrungTage: 120,
    ...(offene.length
      ? {
          formular: {
            aufbewahrungTage: 120,
            schritte: [
              {
                id: "wahl",
                titel: "Welche Wahl?",
                felder: [{ id: "wahl", typ: "radio", label: "Wahl", pflicht: true, standard: offene.length === 1 ? naechste.id : undefined, optionen: offene.map((w) => ({ wert: w.id, label: `${wahlLabel(w)} – Antrag bis ${fmtSchluss(antragsschluss(w))}` })) }],
              },
              {
                id: "person",
                titel: "Ihre Angaben",
                beschreibung: "So wie im Melderegister – damit das Wahlamt Sie im Wählerverzeichnis findet.",
                felder: [
                  { id: "vorname", typ: "text", label: "Vorname(n)", pflicht: true, autocomplete: "given-name", maxLaenge: 80, halb: true },
                  { id: "nachname", typ: "text", label: "Familienname", pflicht: true, autocomplete: "family-name", maxLaenge: 80, halb: true },
                  { id: "geburtsdatum", typ: "date", label: "Geburtsdatum", pflicht: true, autocomplete: "bday" },
                  ...anschrift,
                  { id: "waehlerverzeichnis", typ: "text", label: "Nummer im Wählerverzeichnis (freiwillig)", hinweis: "Steht auf Ihrer Wahlbenachrichtigung, z. B. „Wahlbezirk 012, Nr. 345“.", maxLaenge: 40 },
                ],
              },
              {
                id: "versand",
                titel: "Wohin sollen die Unterlagen?",
                felder: [
                  {
                    id: "versand",
                    typ: "radio",
                    label: "Versand",
                    pflicht: true,
                    standard: "wohnanschrift",
                    optionen: [
                      { wert: "wohnanschrift", label: "An meine Wohnanschrift" },
                      { wert: "andere", label: "An eine andere Anschrift (z. B. Urlaubsort)" },
                      { wert: "abholen", label: "Ich hole sie im Wahlamt ab" },
                    ],
                  },
                  { id: "versandName", typ: "text", label: "Bei / c/o (freiwillig)", maxLaenge: 120, nurWenn: andere },
                  { id: "versandStrasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, maxLaenge: 120, nurWenn: andere },
                  { id: "versandPlzOrt", typ: "text", label: "Postleitzahl und Ort", pflicht: true, maxLaenge: 120, nurWenn: andere },
                  { id: "versandLand", typ: "text", label: "Land (falls nicht Deutschland)", maxLaenge: 60, nurWenn: andere },
                  { id: "email", typ: "email", label: "E-Mail-Adresse", hinweis: "Für die Eingangsbestätigung und den Stand Ihres Antrags.", pflicht: true, autocomplete: "email" },
                  { id: "telefon", typ: "tel", label: "Telefon (freiwillig)", hinweis: "Nur für Rückfragen.", autocomplete: "tel" },
                ],
              },
            ],
            bestaetigungen: [{ id: "persoenlich", label: "Ich stelle diesen Antrag für mich selbst und bin bei dieser Wahl wahlberechtigt." }],
          },
        }
      : {}),
  };
}
