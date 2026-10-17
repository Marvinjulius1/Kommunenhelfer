/**
 * Validierung der geführten Formulare.
 *
 * Wird im Browser (sofortiges Feedback) UND auf dem Server (verbindlich)
 * mit denselben Feld-Definitionen aus der Gemeinde-Konfiguration ausgeführt.
 */
import type { Feld, Formular, FormularSchritt, Sprache } from "@/config/types";
import { deutsch, tx } from "@/lib/i18n";

export type Werte = Record<string, string>;
export type Fehler = Record<string, string>;

const MSG = {
  de: {
    pflicht: "Bitte füllen Sie dieses Feld aus.",
    pflichtAuswahl: "Bitte wählen Sie eine Möglichkeit aus.",
    pflichtCheckbox: "Bitte bestätigen Sie diesen Punkt.",
    email: "Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@beispiel.de.",
    tel: "Bitte geben Sie eine gültige Telefonnummer ein.",
    plz: "Die Postleitzahl besteht aus 5 Ziffern.",
    iban: "Diese IBAN ist nicht gültig. Bitte prüfen Sie die Eingabe.",
    datum: "Bitte geben Sie ein gültiges Datum ein.",
    zahl: "Bitte geben Sie eine Zahl ein.",
    min: (n: number) => `Der Wert muss mindestens ${n} sein.`,
    max: (n: number) => `Der Wert darf höchstens ${n} sein.`,
    laenge: (n: number) => `Bitte höchstens ${n} Zeichen eingeben.`,
    option: "Bitte wählen Sie eine der angebotenen Möglichkeiten.",
    format: "Die Eingabe hat nicht das erwartete Format.",
  },
  en: {
    pflicht: "Please fill in this field.",
    pflichtAuswahl: "Please choose an option.",
    pflichtCheckbox: "Please confirm this item.",
    email: "Please enter a valid email address, e.g. name@example.com.",
    tel: "Please enter a valid phone number.",
    plz: "The postcode consists of 5 digits.",
    iban: "This IBAN is not valid. Please check your entry.",
    datum: "Please enter a valid date.",
    zahl: "Please enter a number.",
    min: (n: number) => `The value must be at least ${n}.`,
    max: (n: number) => `The value must be at most ${n}.`,
    laenge: (n: number) => `Please enter at most ${n} characters.`,
    option: "Please choose one of the options offered.",
    format: "The entry does not have the expected format.",
  },
};

/** Prüft, ob ein Feld angesichts der aktuellen Werte sichtbar ist. */
export function istSichtbar(feld: Feld, werte: Werte): boolean {
  if (!feld.nurWenn) return true;
  const v = werte[feld.nurWenn.feld];
  return Array.isArray(feld.nurWenn.gleich) ? feld.nurWenn.gleich.includes(v) : v === feld.nurWenn.gleich;
}

export function ibanGueltig(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("DE") && iban.length !== 22) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of numeric) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

export function validiereFeld(feld: Feld, roh: string | undefined, lang: Sprache = "de"): string | null {
  const m = deutsch(lang) ? MSG.de : MSG.en;
  const wert = (roh ?? "").trim();

  if (feld.typ === "checkbox") {
    if (feld.pflicht && wert !== "true") return m.pflichtCheckbox;
    return null;
  }
  if (!wert) {
    if (!feld.pflicht) return null;
    return feld.typ === "radio" || feld.typ === "select" ? m.pflichtAuswahl : m.pflicht;
  }

  const maxLaenge = feld.maxLaenge ?? (feld.typ === "textarea" ? 2000 : 200);
  if (wert.length > maxLaenge) return m.laenge(maxLaenge);

  switch (feld.typ) {
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(wert)) return m.email;
      break;
    case "tel":
      if (!/^\+?[0-9 ()/-]{5,25}$/.test(wert)) return m.tel;
      break;
    case "plz":
      if (!/^[0-9]{5}$/.test(wert)) return m.plz;
      break;
    case "iban":
      if (!ibanGueltig(wert)) return m.iban;
      break;
    case "date": {
      const d = new Date(wert);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(wert) || Number.isNaN(d.getTime())) return m.datum;
      const jahr = d.getFullYear();
      if (jahr < 1900 || jahr > new Date().getFullYear() + 5) return m.datum;
      break;
    }
    case "number": {
      const n = Number(wert);
      if (!Number.isFinite(n)) return m.zahl;
      if (feld.min !== undefined && n < feld.min) return m.min(feld.min);
      if (feld.max !== undefined && n > feld.max) return m.max(feld.max);
      break;
    }
    case "radio":
    case "select":
      if (!feld.optionen?.some((o) => o.wert === wert)) return m.option;
      break;
  }

  if (feld.muster && !new RegExp(feld.muster).test(wert)) {
    return feld.musterFehler ? tx(feld.musterFehler, lang) : m.format;
  }
  return null;
}

export function validiereSchritt(schritt: FormularSchritt, werte: Werte, lang: Sprache = "de"): Fehler {
  const fehler: Fehler = {};
  for (const feld of schritt.felder) {
    if (!istSichtbar(feld, werte)) continue;
    const f = validiereFeld(feld, werte[feld.id], lang);
    if (f) fehler[feld.id] = f;
  }
  return fehler;
}

/**
 * Validiert das komplette Formular und gibt nur bekannte, sichtbare Felder
 * zurück (Datensparsamkeit: alles andere wird verworfen).
 */
export function validiereFormular(formular: Formular, eingabe: Record<string, unknown>, lang: Sprache = "de") {
  const werte: Werte = {};
  for (const [k, v] of Object.entries(eingabe)) if (typeof v === "string") werte[k] = v;

  const fehler: Fehler = {};
  const bereinigt: Werte = {};
  for (const schritt of formular.schritte) {
    Object.assign(fehler, validiereSchritt(schritt, werte, lang));
    for (const feld of schritt.felder) {
      if (istSichtbar(feld, werte) && werte[feld.id] !== undefined && werte[feld.id] !== "") {
        bereinigt[feld.id] = feld.typ === "iban" ? werte[feld.id].replace(/\s+/g, "").toUpperCase() : werte[feld.id].trim();
      }
    }
  }
  return { ok: Object.keys(fehler).length === 0, fehler, werte: bereinigt };
}

/** Anzeige eines Wertes in der Zusammenfassung (Optionen → Label, IBAN maskiert …). */
export function anzeigeWert(feld: Feld, wert: string | undefined, lang: Sprache = "de"): string {
  if (!wert) return "–";
  if (feld.typ === "checkbox") return wert === "true" ? (deutsch(lang) ? "Ja" : "Yes") : (deutsch(lang) ? "Nein" : "No");
  if (feld.optionen) return tx(feld.optionen.find((o) => o.wert === wert)?.label, lang) || wert;
  if (feld.typ === "date") {
    const [y, mo, d] = wert.split("-");
    return deutsch(lang) ? `${d}.${mo}.${y}` : `${d}/${mo}/${y}`;
  }
  if (feld.sensibel) {
    const clean = wert.replace(/\s+/g, "");
    return clean.slice(0, 4) + " •••• •••• " + clean.slice(-4);
  }
  return wert;
}
