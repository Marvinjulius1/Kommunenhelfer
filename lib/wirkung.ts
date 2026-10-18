/**
 * Wirkungsbericht: Was hat das Portal der Gemeinde gebracht?
 * Grundlage sind ausschließlich die Tageszähler (lib/statistik.ts) – keine Personendaten.
 * Eingesparte Zeit und Kosten beruhen auf offen ausgewiesenen, anpassbaren Annahmen.
 */
import type { GemeindeConfig, Wirkungsannahmen } from "@/config/types";
import { plusTage } from "@/lib/feiertage";

/** Konservative Standardwerte – die Gemeinde passt sie in der Konfiguration an (`wirkung`). */
export const STANDARD_WIRKUNG: Wirkungsannahmen = {
  minutenProAntrag: 12,
  minutenProTermin: 4,
  minutenProAuskunft: 3,
  portoCent: 95,
  stundensatzEuro: 62,
};

export function annahmen(tenant: Pick<GemeindeConfig, "wirkung">): Wirkungsannahmen {
  return { ...STANDARD_WIRKUNG, ...tenant.wirkung };
}

export type ZeitraumArt = "monat" | "vormonat" | "quartal" | "jahr";
export const ZEITRAUM_LABEL: Record<ZeitraumArt, string> = { monat: "Dieser Monat", vormonat: "Letzter Monat", quartal: "Letzte 3 Monate", jahr: "Dieses Jahr" };

export interface Zeitraum {
  von: string;
  bis: string;
  /** Gleich langer Zeitraum davor – für den Vergleich */
  vorVon: string;
  vorBis: string;
  titel: string;
}

const tage = (von: string, bis: string) => Math.round((Date.parse(bis) - Date.parse(von)) / 86_400_000) + 1;
const monatsname = (d: string) => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const fmt = (d: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

export function zeitraum(art: ZeitraumArt, heute: string): Zeitraum {
  const [j, m] = [Number(heute.slice(0, 4)), Number(heute.slice(5, 7))];
  const ersterVon = (jahr: number, monat: number) => new Date(Date.UTC(jahr, monat - 1, 1)).toISOString().slice(0, 10);
  let von: string, bis: string, titel: string;
  if (art === "monat") {
    von = ersterVon(j, m);
    bis = heute;
    titel = `${monatsname(von)} (bis ${fmt(heute)})`;
  } else if (art === "vormonat") {
    von = ersterVon(m === 1 ? j - 1 : j, m === 1 ? 12 : m - 1);
    bis = plusTage(ersterVon(j, m), -1);
    titel = monatsname(von);
  } else if (art === "quartal") {
    von = plusTage(heute, -89);
    bis = heute;
    titel = `${fmt(von)} – ${fmt(bis)}`;
  } else {
    von = `${j}-01-01`;
    bis = heute;
    titel = `${j} (bis ${fmt(heute)})`;
  }
  const n = tage(von, bis);
  return { von, bis, vorBis: plusTage(von, -1), vorVon: plusTage(von, -n), titel };
}

type Tag = { zaehler: Partial<Record<string, number>>; leistungen: Record<string, number> };

export interface Kennzahlen {
  antraege: number;
  termine: number;
  wartemarken: number;
  auskuenfte: number;
  anfragen: number;
  bescheide: number;
  zahlungen: number;
  umsatzCent: number;
  maengel: number;
  kontenNeu: number;
  /** Anteil online eingegangener Anliegen an allen erfassten (online + Termine + Wartenummern), 0–1 */
  onlineQuote: number | null;
  gesparteStunden: number;
  gesparteEuro: number;
  portoEuro: number;
  /** Durchschnittliche Bearbeitungsdauer erledigter Vorgänge in Tagen */
  dauerTage: number | null;
  erledigt: number;
  fristQuote: number | null;
  zufriedenheit: number | null;
  bewertungen: number;
  leistungen: Record<string, number>;
}

export function kennzahlen(liste: Tag[], a: Wirkungsannahmen): Kennzahlen {
  const s = (k: string) => liste.reduce((x, t) => x + (t.zaehler[k] ?? 0), 0);
  const antraege = s("vorgaenge");
  const termine = s("termine");
  const wartemarken = s("wartemarken");
  const auskuenfte = s("assistent_beantwortet");
  const bescheide = s("bescheide_digital");
  const erledigt = s("erledigt");
  const bewertungen = s("bewertungen");
  const gesparteStunden = (antraege * a.minutenProAntrag + termine * a.minutenProTermin + auskuenfte * a.minutenProAuskunft) / 60;
  const portoEuro = (bescheide * a.portoCent) / 100;
  const leistungen: Record<string, number> = {};
  for (const t of liste) for (const [id, n] of Object.entries(t.leistungen)) leistungen[id] = (leistungen[id] ?? 0) + n;
  const alle = antraege + termine + wartemarken;
  return {
    antraege,
    termine,
    wartemarken,
    auskuenfte,
    anfragen: s("assistent_anfragen"),
    bescheide,
    zahlungen: s("zahlungen"),
    umsatzCent: s("zahlungen_cent"),
    maengel: s("maengel"),
    kontenNeu: s("konten_neu"),
    onlineQuote: alle ? antraege / alle : null,
    gesparteStunden,
    gesparteEuro: gesparteStunden * a.stundensatzEuro + portoEuro,
    portoEuro,
    dauerTage: erledigt ? s("erledigt_stunden") / erledigt / 24 : null,
    erledigt,
    fristQuote: erledigt ? s("frist_eingehalten") / erledigt : null,
    zufriedenheit: bewertungen ? s("bewertung_summe") / bewertungen : null,
    bewertungen,
    leistungen,
  };
}

/** Veränderung gegenüber dem Vorzeitraum in Prozent (null, wenn es keinen Vergleichswert gibt). */
export function veraenderung(jetzt: number, vorher: number): number | null {
  if (!vorher) return null;
  return Math.round(((jetzt - vorher) / vorher) * 100);
}
