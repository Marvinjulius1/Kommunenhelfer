/** Wiederverwendbare Formular-Bausteine für die Musterstadt. */
import type { Feld, FormularSchritt } from "@/config/types";

// ---------------------------------------------------------------------------
// Wiederverwendbare Formular-Bausteine
// ---------------------------------------------------------------------------

export const ORT = "Musterstadt";
export const PLZ = "12345";

/** Persönliche Angaben – wird in mehreren Formularen genutzt. */
export const person: Feld[] = [
  { id: "vorname", typ: "text", label: "Vorname", pflicht: true, autocomplete: "given-name", maxLaenge: 80, halb: true },
  { id: "nachname", typ: "text", label: "Nachname", pflicht: true, autocomplete: "family-name", maxLaenge: 80, halb: true },
  { id: "geburtsdatum", typ: "date", label: "Geburtsdatum", pflicht: true, autocomplete: "bday" },
];

export const anschrift: Feld[] = [
  { id: "strasse", typ: "text", label: "Straße und Hausnummer", pflicht: true, autocomplete: "street-address", maxLaenge: 120 },
  { id: "plz", typ: "plz", label: "Postleitzahl", pflicht: true, autocomplete: "postal-code", standard: PLZ, halb: true },
  { id: "ort", typ: "text", label: "Ort", pflicht: true, autocomplete: "address-level2", standard: ORT, halb: true },
];

export const erreichbarkeit: Feld[] = [
  {
    id: "email",
    typ: "email",
    label: "E-Mail-Adresse",
    hinweis: "Hierhin senden wir die Eingangsbestätigung.",
    pflicht: true,
    autocomplete: "email",
  },
  { id: "telefon", typ: "tel", label: "Telefon (freiwillig)", hinweis: "Nur für Rückfragen.", autocomplete: "tel" },
];

export const kontaktSchritt: FormularSchritt = {
  id: "kontakt",
  titel: "Ihre Angaben",
  beschreibung: "Wir benötigen Ihren Namen und Ihre Anschrift.",
  felder: [...person, ...anschrift, ...erreichbarkeit],
};

