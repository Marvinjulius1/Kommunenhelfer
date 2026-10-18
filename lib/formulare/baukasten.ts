/**
 * Formular-Baukasten: Gemeinden erstellen eigene Online-Anträge im Backoffice.
 * Aus einer einfachen Beschreibung (Schritte, Felder, Texte) entsteht eine
 * vollwertige `Leistung` – geprüft mit denselben Regeln wie die Konfigurationsdatei.
 * Gemeinsam für Browser (Vorschau) und Server (Speichern).
 */
import type { Feld, FeldTyp, Leistung } from "@/config/types";
import { tx } from "@/lib/i18n";

export const BAU_TYPEN: { typ: FeldTyp; label: string }[] = [
  { typ: "text", label: "Kurzer Text" },
  { typ: "textarea", label: "Längerer Text" },
  { typ: "date", label: "Datum" },
  { typ: "number", label: "Zahl" },
  { typ: "radio", label: "Auswahl (eine Antwort)" },
  { typ: "select", label: "Auswahlliste" },
  { typ: "checkbox", label: "Ankreuzen (Ja)" },
  { typ: "email", label: "E-Mail-Adresse" },
  { typ: "tel", label: "Telefonnummer" },
  { typ: "iban", label: "IBAN" },
];

export interface BauFeld {
  label: string;
  typ: FeldTyp;
  pflicht: boolean;
  hinweis?: string;
  /** Für Auswahlfelder: eine Option je Eintrag */
  optionen?: string[];
}

export interface BauSchritt {
  titel: string;
  beschreibung?: string;
  felder: BauFeld[];
}

export interface BauLeistung {
  /** Leer bei neuen Formularen – wird aus dem Titel erzeugt */
  id?: string;
  aktiv: boolean;
  titel: string;
  kurz: string;
  amtId: string;
  stichworte: string[];
  unterlagen: string[];
  ablauf: string[];
  /** Gebühr in Euro; null = kostenfrei; undefined = keine Angabe */
  gebuehr?: number | null;
  /** Gebühr direkt online bezahlen */
  onlineBezahlen: boolean;
  /** Kontaktangaben: kurz = Name, E-Mail, Telefon; voll = zusätzlich Geburtsdatum und Anschrift */
  kontakt: "kurz" | "voll";
  aufbewahrungTage: number;
  schritte: BauSchritt[];
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "formular"
  );
}

const camel = (s: string) => slug(s).replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Standard-Kontaktschritt (Pflicht: ohne E-Mail keine Eingangsbestätigung). */
export function kontaktFelder(art: "kurz" | "voll", ort?: string): Feld[] {
  const name: Feld[] = [
    { id: "vorname", typ: "text", label: "Vorname", pflicht: true, autocomplete: "given-name", maxLaenge: 80, halb: true },
    { id: "nachname", typ: "text", label: "Nachname", pflicht: true, autocomplete: "family-name", maxLaenge: 80, halb: true },
  ];
  const voll: Feld[] = [
    { id: "geburtsdatum", typ: "date", label: "Geburtsdatum", pflicht: true, autocomplete: "bday" },
    { id: "strasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, autocomplete: "street-address", maxLaenge: 120 },
    { id: "plz", typ: "plz", label: "Postleitzahl", pflicht: true, autocomplete: "postal-code", halb: true },
    { id: "ort", typ: "text", label: "Ort", pflicht: true, autocomplete: "address-level2", standard: ort, halb: true },
  ];
  const kontakt: Feld[] = [
    { id: "email", typ: "email", label: "E-Mail-Adresse", hinweis: "Hierhin senden wir die Eingangsbestätigung.", pflicht: true, autocomplete: "email" },
    { id: "telefon", typ: "tel", label: "Telefon (freiwillig)", hinweis: "Nur für Rückfragen.", autocomplete: "tel" },
  ];
  return [...name, ...(art === "voll" ? voll : []), ...kontakt];
}

export const STANDARD_ABLAUF = ["Sie füllen den Online-Antrag aus.", "Sie erhalten sofort eine Eingangsbestätigung per E-Mail.", "Das Amt prüft Ihren Antrag und meldet sich bei Ihnen."];

/** Baut aus der Beschreibung eine vollständige Leistung. `belegt` = IDs, die schon vergeben sind. */
export function baueLeistung(b: BauLeistung, belegt: Set<string>, ort?: string): Leistung {
  let id = b.id || slug(b.titel);
  if (!b.id) for (let i = 2; belegt.has(id); i++) id = `${slug(b.titel)}-${i}`;
  const kontakt = kontaktFelder(b.kontakt, ort);
  const vergeben = new Set(kontakt.map((f) => f.id));
  const feldId = (label: string) => {
    let f = camel(label) || "angabe";
    if (vergeben.has(f)) f = `${f}Angabe`;
    for (let i = 2; vergeben.has(f); i++) f = `${camel(label)}${i}`;
    vergeben.add(f);
    return f;
  };
  const schritte = b.schritte
    .filter((s) => s.felder.length)
    .map((s, i) => ({
      id: `schritt-${i + 1}`,
      titel: s.titel,
      ...(s.beschreibung ? { beschreibung: s.beschreibung } : {}),
      felder: s.felder.map((f): Feld => {
        const auswahl = f.typ === "radio" || f.typ === "select";
        return {
          id: feldId(f.label),
          typ: f.typ,
          label: f.label,
          ...(f.hinweis ? { hinweis: f.hinweis } : {}),
          ...(f.pflicht ? { pflicht: true } : {}),
          ...(auswahl ? { optionen: (f.optionen ?? []).filter(Boolean).map((o) => ({ wert: slug(o), label: o })) } : {}),
          ...(f.typ === "text" ? { maxLaenge: 200 } : f.typ === "textarea" ? { maxLaenge: 2000 } : {}),
          ...(f.typ === "iban" ? { sensibel: true } : {}),
        };
      }),
    }));
  return {
    id,
    aktiv: b.aktiv,
    titel: b.titel,
    kurz: b.kurz,
    stichworte: [...new Set([...b.stichworte.map((s) => s.trim().toLowerCase()).filter(Boolean), b.titel.toLowerCase()])],
    unterlagen: b.unterlagen.filter(Boolean),
    gebuehren: b.gebuehr === undefined ? [] : [{ bezeichnung: "Gebühr", betrag: b.gebuehr }],
    ablauf: b.ablauf.filter(Boolean).length ? b.ablauf.filter(Boolean) : STANDARD_ABLAUF,
    amtId: b.amtId,
    online: true,
    termin: false,
    ...(b.onlineBezahlen && typeof b.gebuehr === "number" && b.gebuehr > 0 ? { bezahlung: { betrag: b.gebuehr } } : {}),
    formular: {
      aufbewahrungTage: b.aufbewahrungTage,
      schritte: [{ id: "kontakt", titel: "Ihre Angaben", beschreibung: "Damit wir Sie erreichen können.", felder: kontakt }, ...schritte],
    },
  };
}

/** Umgekehrt: eine bestehende Leistung als Startpunkt für den Baukasten (z. B. als Vorlage). */
export function zuBau(l: Leistung): BauLeistung {
  const schritte = (l.formular?.schritte ?? []).filter((s) => s.id !== "kontakt");
  const g = l.gebuehren.find((x) => typeof x.betrag === "number" || x.betrag === null);
  const kontaktIds = new Set(l.formular?.schritte.find((s) => s.id === "kontakt")?.felder.map((f) => f.id) ?? []);
  return {
    id: l.id,
    aktiv: l.aktiv,
    titel: tx(l.titel, "de"),
    kurz: tx(l.kurz, "de"),
    amtId: l.amtId ?? "",
    stichworte: l.stichworte.filter((s) => s !== tx(l.titel, "de").toLowerCase()),
    unterlagen: l.unterlagen.map((u) => tx(u, "de")),
    ablauf: l.ablauf.map((a) => tx(a, "de")),
    gebuehr: g ? (g.betrag as number | null) : undefined,
    onlineBezahlen: !!l.bezahlung,
    kontakt: kontaktIds.has("strasse") ? "voll" : "kurz",
    aufbewahrungTage: l.formular?.aufbewahrungTage ?? 180,
    schritte: schritte.map((s) => ({
      titel: tx(s.titel, "de"),
      beschreibung: s.beschreibung ? tx(s.beschreibung, "de") : undefined,
      felder: s.felder
        .filter((f) => BAU_TYPEN.some((t) => t.typ === f.typ))
        .map((f) => ({ label: tx(f.label, "de"), typ: f.typ, pflicht: !!f.pflicht, hinweis: f.hinweis ? tx(f.hinweis, "de") : undefined, optionen: f.optionen?.map((o) => tx(o.label, "de")) })),
    })),
  };
}
