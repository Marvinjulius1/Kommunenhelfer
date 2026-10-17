/**
 * Schlanke Fassung der Gemeinde-Config für den Browser.
 * Die volle Config (alle Sprachen, alle Formulare, FAQ, Ratsinfo …) wäre auf
 * jeder Seite im HTML – das kostet Ladezeit, vor allem auf älteren Handys.
 * Der Browser bekommt nur die gewählte Sprache und keine Formulardefinitionen
 * (ein Antrag erhält seine Leistung vollständig vom Server).
 */
import type { GemeindeConfig, Sprache } from "@/config/types";
import { SPRACHEN, tx } from "@/lib/i18n";

const SPRACHSCHLUESSEL = new Set<string>(SPRACHEN);

function istLText(o: Record<string, unknown>): boolean {
  const k = Object.keys(o);
  return k.length > 0 && typeof o.de === "string" && k.every((x) => SPRACHSCHLUESSEL.has(x) && typeof o[x] === "string");
}

/** Ersetzt übersetzbare Texte durch die Fassung in der gewählten Sprache. */
function eineSprache<T>(wert: T, lang: Sprache): T {
  if (Array.isArray(wert)) return wert.map((x) => eineSprache(x, lang)) as T;
  if (wert && typeof wert === "object") {
    const o = wert as Record<string, unknown>;
    if (istLText(o)) return tx(o as never, lang) as T;
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, eineSprache(v, lang)])) as T;
  }
  return wert;
}

export function fuerBrowser(tenant: GemeindeConfig, lang: Sprache): GemeindeConfig {
  const schlank: GemeindeConfig = {
    ...tenant,
    leistungen: tenant.leistungen.map((l) => ({
      ...l,
      // nur noch ein Merker „hat ein Online-Formular“
      formular: l.formular ? { aufbewahrungTage: l.formular.aufbewahrungTage, schritte: [] } : undefined,
    })),
    faq: [],
    rueckfragen: [],
    textbausteine: undefined,
    ratsinfo: undefined,
    lebenslagen: undefined,
    fundsachen: undefined,
  };
  return eineSprache(schlank, lang);
}
