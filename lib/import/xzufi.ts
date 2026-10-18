/**
 * Leistungsbeschreibungen aus XZuFi übernehmen (Austauschformat des Portalverbunds,
 * z. B. Export aus dem Landesredaktionssystem oder dem PVOG). Aus jeder `leistung`
 * entsteht eine Leistung des Portals – Texte werden zu reinem Text (kein HTML
 * wird je ausgegeben) und als Daten behandelt, nie als Anweisungen.
 *
 * Zuordnung der LeiKa-Textmodule (Code → Feld). Bei abweichenden Exporten hier anpassen.
 */
import type { Gebuehr, Leistung } from "@/config/types";
import { slug } from "@/lib/formulare/baukasten";
import { alle, entschluessele, erstes, htmlVon, leseXml, textVon, type XmlKnoten } from "./xml";

export const TEXTMODULE: Record<string, keyof Rohdaten> = {
  "01": "titel",
  "03": "volltext",
  "04": "unterlagen",
  "05": "voraussetzungen",
  "06": "kosten",
  "07": "ablauf",
  "08": "dauer",
  "09": "frist",
  "11": "hinweise",
  "12": "rechtsgrundlage",
  "14": "kurz",
};

interface Rohdaten {
  titel: string;
  volltext: string;
  unterlagen: string;
  voraussetzungen: string;
  kosten: string;
  ablauf: string;
  dauer: string;
  frist: string;
  hinweise: string;
  rechtsgrundlage: string;
  kurz: string;
}

export interface ImportLeistung {
  /** Kennung aus der Quelle (für die Anzeige) */
  quelleId: string;
  leistungsschluessel?: string;
  titel: string;
  kurz: string;
  beschreibung?: string;
  unterlagen: string[];
  ablauf: string[];
  fristen: string[];
  gebuehren: { bezeichnung: string; betrag: number | null | string }[];
  rechtsgrundlage?: string;
  dauer?: string;
  stichworte: string[];
}

/** HTML-Fragment → Absätze bzw. Listenpunkte als reiner Text. */
export function htmlZuText(html: string): string {
  return entschluessele(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|ul|ol|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n+•/g, "\n•")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlZuListe(html: string): string[] {
  const text = htmlZuText(html);
  const punkte = text.split("\n").map((z) => z.replace(/^[•\-–*]\s*/, "").trim()).filter((z) => z.length > 1);
  return punkte.map((p) => p.slice(0, 300)).slice(0, 20);
}

const ersterSatz = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.{20,300}?[.!?])(\s|$)/);
  return (m ? m[1] : t.slice(0, 300)).trim();
};

function inhalt(modul: XmlKnoten): string {
  // Deutsche Fassung bevorzugen, sonst die erste
  const inhalte = alle(modul, "inhalt");
  const de = inhalte.find((i) => /^de/i.test(i.attr.languageCode ?? i.attr.lang ?? "de")) ?? inhalte[0];
  return de ? htmlVon(de) : "";
}

function betraege(l: XmlKnoten): ImportLeistung["gebuehren"] {
  const liste: ImportLeistung["gebuehren"] = [];
  for (const k of alle(l, "kosten")) {
    const fix = textVon(erstes(k, "betragFix") ?? erstes(k, "betrag"));
    const von = textVon(erstes(k, "betragVon"));
    const bis = textVon(erstes(k, "betragBis"));
    const bez = htmlZuText(inhalt(k) || textVon(erstes(k, "beschreibung"))).split("\n")[0] || "Gebühr";
    const zahl = (s: string) => (s && Number.isFinite(Number(s.replace(",", "."))) ? Number(s.replace(",", ".")) : undefined);
    // 0 € heißt kostenfrei
    if (zahl(fix) !== undefined) liste.push({ bezeichnung: bez.slice(0, 120), betrag: zahl(fix) === 0 ? null : zahl(fix)! });
    else if (zahl(von) !== undefined && zahl(bis) !== undefined) liste.push({ bezeichnung: bez.slice(0, 120), betrag: `${zahl(von)!.toFixed(2).replace(".", ",")} bis ${zahl(bis)!.toFixed(2).replace(".", ",")} Euro` });
  }
  return liste.slice(0, 10);
}

export function leseXzufi(xml: string): ImportLeistung[] {
  const doc = leseXml(xml);
  return alle(doc, "leistung")
    .filter((l) => alle(l, "modulText").length || erstes(l, "bezeichnung"))
    .slice(0, 500)
    .map((l, i) => {
      const roh: Partial<Rohdaten> = {};
      for (const m of alle(l, "modulText")) {
        const code = textVon(erstes(erstes(m, "leikaTextmodul") ?? erstes(m, "textmodul") ?? m, "code")).padStart(2, "0");
        const feld = TEXTMODULE[code];
        if (feld && !roh[feld]) roh[feld] = inhalt(m);
      }
      const titel = htmlZuText(roh.titel ?? "") || textVon(erstes(l, "bezeichnung")) || textVon(erstes(l, "leistungsbezeichnung"));
      const volltext = htmlZuText([roh.volltext, roh.voraussetzungen && `Voraussetzungen:\n${roh.voraussetzungen}`, roh.hinweise && `Hinweise:\n${roh.hinweise}`].filter(Boolean).join("\n\n"));
      const schluessel = [erstes(l, "referenzLeiKa"), erstes(l, "leistungsschluessel"), erstes(l, "leikaSchluessel")].map((k) => textVon(k).match(/\d{14}/)?.[0]).find(Boolean);
      const gebuehren = betraege(l);
      const kostenText = htmlZuText(roh.kosten ?? "");
      return {
        quelleId: textVon(erstes(l, "id")) || String(i + 1),
        leistungsschluessel: schluessel,
        titel: titel.slice(0, 100),
        kurz: ersterSatz(htmlZuText(roh.kurz ?? "") || volltext || titel).slice(0, 400),
        beschreibung: volltext ? volltext.slice(0, 6000) : undefined,
        unterlagen: htmlZuListe(roh.unterlagen ?? ""),
        ablauf: htmlZuListe(roh.ablauf ?? "").slice(0, 10),
        fristen: htmlZuListe(roh.frist ?? "").slice(0, 5),
        gebuehren: gebuehren.length ? gebuehren : kostenText ? [{ bezeichnung: "Kosten", betrag: kostenText.slice(0, 300) }] : [],
        rechtsgrundlage: htmlZuText(roh.rechtsgrundlage ?? "").slice(0, 500) || undefined,
        dauer: htmlZuText(roh.dauer ?? "").slice(0, 120) || undefined,
        stichworte: [...new Set([titel.toLowerCase(), ...alle(l, "begriffImKontext").concat(alle(l, "stichwort"), alle(l, "synonym")).map((k) => textVon(k).toLowerCase())])].filter((s) => s && s.length <= 60).slice(0, 20),
      };
    })
    .filter((x) => x.titel.length >= 3);
}

/** Übernahme als Info-Leistung des Portals (online beantragen später per Formular-Baukasten). */
export function alsLeistung(x: ImportLeistung, amtId: string, belegt: Set<string>): Leistung {
  let id = slug(x.titel);
  for (let i = 2; belegt.has(id); i++) id = `${slug(x.titel)}-${i}`;
  belegt.add(id);
  return {
    id,
    aktiv: true,
    titel: x.titel,
    kurz: x.kurz.length >= 10 ? x.kurz : `${x.titel}.`,
    ...(x.beschreibung ? { beschreibung: x.beschreibung } : {}),
    stichworte: x.stichworte.length ? x.stichworte : [x.titel.toLowerCase()],
    unterlagen: x.unterlagen,
    gebuehren: x.gebuehren as Gebuehr[],
    ablauf: x.ablauf,
    ...(x.fristen.length ? { fristen: x.fristen } : {}),
    amtId,
    online: false,
    termin: false,
    ...(x.dauer ? { dauer: x.dauer } : {}),
    ...(x.leistungsschluessel ? { leistungsschluessel: x.leistungsschluessel } : {}),
    ...(x.rechtsgrundlage ? { rechtsgrundlage: x.rechtsgrundlage } : {}),
  };
}
