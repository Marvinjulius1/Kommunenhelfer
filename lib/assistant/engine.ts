/**
 * Der Assistent – Orchestrierung.
 *
 * Grundprinzip: Der Assistent erfindet NICHTS. Er antwortet nur auf Basis
 *   1. der Gemeinde-Konfiguration (Leistungen, Gebühren, Unterlagen, Kontakt) und
 *   2. der Wissensbasis (tenants/<slug>/wissen/*.md, FAQ).
 * Findet er nichts Gesichertes, sagt er das ehrlich und bietet Kontakt
 * oder einen Termin an.
 *
 * Ablauf:
 *   Anfrage → Analyse (Leistung? Rückfrage? Wissensbasis?) →
 *     a) eindeutige Fälle: deterministische Antwort aus der Konfiguration
 *     b) offene Fragen: Sprachmodell (falls konfiguriert) mit strengem Kontext
 *     c) Fallback: regelbasierte Antwort / ehrliches "weiß ich nicht sicher"
 */
import "server-only";
import { z } from "zod";
import type { GemeindeConfig, Leistung, Rueckfrage, Sprache } from "@/config/types";
import { deutsch, dict, formatEuro, tx, WOCHENTAGE } from "@/lib/i18n";
import { aktiveLeistungen, findeLeistung } from "@/lib/tenant";
import type { Aktion, Antwort, AssistentAnfrage } from "./types";
import { dienstAntwort } from "./dienste";
import { suche, type Treffer } from "./knowledge";
import { enthaeltPhrase, istFrage, normalisiere, tokens } from "./text";
import { getProvider } from "./providers";
import { redact } from "./redact";
import { decryptJson } from "@/lib/crypto";
import { artLabel, fehlendeUnterlagen, zustaendigesAmt } from "@/lib/uploads/pruefung";
import { uploadsImEntwurf } from "@/lib/uploads/service";

/** Sprache der Antwort des Sprachmodells (Fakten wie Gebühren stammen weiter aus der Konfiguration). */
const ANTWORTSPRACHE: Record<Sprache, string> = {
  de: "auf Deutsch",
  ls: "in Leichter Sprache: sehr kurze Sätze, ein Gedanke pro Satz, einfache Wörter, lange Wörter mit Bindestrich (z. B. Hunde-Steuer), keine Fremdwörter",
  en: "in English",
  tr: "auf Türkisch",
  uk: "auf Ukrainisch",
  ar: "auf Arabisch",
  ru: "auf Russisch",
};

/** Ab hier gilt ein Wissensbasis-Treffer als gesichert (Punktzahl und Anteil gefundener Begriffe). */
const WISSEN_SCHWELLE = 1.5;
const WISSEN_ABDECKUNG = 0.6;

type Aspekt = "gebuehren" | "unterlagen" | "ablauf" | "fristen" | "termin";

interface Analyse {
  text: string;
  leistung?: Leistung;
  /** true, wenn das Stichwort spezifisch war (z. B. "Hund anmelden" statt nur "Hund"). */
  leistungEindeutig: boolean;
  rueckfrage?: Rueckfrage;
  treffer: Treffer[];
  frage: boolean;
  aspekt?: Aspekt;
  smalltalk?: "gruss" | "dank";
}

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

function erkenneAspekt(n: string): Aspekt | undefined {
  if (/\b(kost|kosten|kostet|gebuehr\w*|preis|teuer|bezahlen|steuer betraegt|wie viel|wieviel|fee|cost)/.test(n)) return "gebuehren";
  if (/\b(unterlagen|mitbringen|dokumente|nachweis\w*|benoetige|documents|bring)/.test(n)) return "unterlagen";
  if (/\b(frist\w*|bis wann|deadline|spaetestens)/.test(n)) return "fristen";
  if (/\b(termin\w*|appointment)/.test(n)) return "termin";
  if (/\b(ablauf|wie lange|dauer\w*|wie geht|schritte|how long)/.test(n)) return "ablauf";
  return undefined;
}

async function analysiere(tenant: GemeindeConfig, text: string, kontextId?: string): Promise<Analyse> {
  const n = normalisiere(text);
  const alle = new Set(tokens(text, true));

  // Leistungen bewerten: Mehrwort-Stichworte zählen stärker.
  let beste: { l: Leistung; score: number; woerter: string[] } | undefined;
  for (const l of aktiveLeistungen(tenant)) {
    // Titel in allen Sprachen der Gemeinde zählen als Stichwort (einfache Erkennung auch ohne Sprachmodell)
    const titel = typeof l.titel === "string" ? [l.titel] : Object.values(l.titel).filter((t): t is string => !!t);
    const gefunden = [...l.stichworte, ...titel].filter((s) => enthaeltPhrase(alle, n, s));
    // Gleiche Wortstämme nur einmal zählen ("Hund" / "Hunde"); Mehrwort-Treffer zählen stärker.
    const woerter = [...new Map(gefunden.map((w) => [tokens(w, true).sort().join(" "), w])).values()];
    const score = woerter.reduce((s, w) => s + tokens(w, true).length ** 2 * 2 + 1, 0);
    if (score > 0 && (!beste || score > beste.score)) beste = { l, score, woerter };
  }

  // Rückfragen: greifen, wenn das Anliegen nur allgemein beschrieben ist.
  const rueckfrageKandidat = tenant.rueckfragen.find((r) => r.stichworte.some((s) => enthaeltPhrase(alle, n, s)));
  // Ein Treffer ist "allgemein", wenn alle seine Wörter auch Rückfrage-Stichwörter sind
  // (z. B. "Hund" → anmelden oder abmelden?).
  const rfTokens = new Set((rueckfrageKandidat?.stichworte ?? []).flatMap((s) => tokens(s, true)));
  const leistungEindeutig = !!beste && beste.woerter.some((w) => tokens(w, true).some((t) => !rfTokens.has(t)));
  // Inhaltliche Fragen, die über das Stichwort hinausgehen ("Darf der Hund des Nachbarn …?"),
  // sind keine Rückfrage wert – hier antworten wir aus der Wissensbasis oder ehrlich mit "weiß ich nicht".
  const offeneFrage = istFrage(text) && tokens(text).filter((t) => !rfTokens.has(t)).length >= 2;
  const rueckfrage = leistungEindeutig || offeneFrage ? undefined : rueckfrageKandidat;

  const smalltalk =
    /^(hallo|hi|guten (tag|morgen|abend)|moin|servus|gruess gott|hello|good (morning|afternoon))\b/.test(n) && n.split(" ").length <= 4
      ? "gruss"
      : /^(danke|vielen dank|dankeschoen|thanks|thank you)\b/.test(n) && n.split(" ").length <= 5
        ? "dank"
        : undefined;

  const aspekt = erkenneAspekt(n);
  let leistung = beste?.l;
  // Folgefrage ohne neue Leistung ("Was kostet das?") → Kontext der vorherigen Antwort.
  if (!leistung && aspekt && kontextId) leistung = findeLeistung(tenant, kontextId);

  return {
    text,
    leistung,
    leistungEindeutig: !!leistung && (leistungEindeutig || (!beste && !!kontextId)),
    rueckfrage,
    treffer: await suche(tenant, text),
    frage: istFrage(text),
    aspekt,
    smalltalk,
  };
}

// ---------------------------------------------------------------------------
// Bausteine für deterministische Antworten
// ---------------------------------------------------------------------------

export function gebuehrText(g: Leistung["gebuehren"][number], lang: Sprache): string {
  const betrag = g.betrag === null ? dict(lang).kostenfrei : typeof g.betrag === "number" ? formatEuro(g.betrag, lang) : g.betrag;
  return `${tx(g.bezeichnung, lang)}: **${betrag}**${g.hinweis ? ` (${tx(g.hinweis, lang)})` : ""}`;
}

function aktionenFuer(l: Leistung, lang: Sprache): Aktion[] {
  const d = dict(lang);
  const a: Aktion[] = [];
  if (l.online && l.formular) a.push({ typ: "antrag", leistungId: l.id, label: d.onlineBeantragen, hinweis: tx(l.dauer, lang) || undefined });
  if (l.termin) a.push({ typ: "termin", leistungId: l.id, label: d.terminBuchen });
  if (l.externerLink) a.push({ typ: "link", url: l.externerLink.url, label: tx(l.externerLink.label, lang) });
  if (!l.online && !l.termin) a.push({ typ: "kontakt", label: d.kontaktAufnehmen });
  return a;
}

function leistungAntwort(l: Leistung, lang: Sprache): Antwort {
  const teile = [`**${tx(l.titel, lang)}**`, tx(l.kurz, lang)];
  if (l.beschreibung) teile.push(tx(l.beschreibung, lang));
  const naechster =
    l.online && l.formular
      ? deutsch(lang)
        ? `Sie können das direkt hier online erledigen${l.dauer ? ` – das dauert ${tx(l.dauer, lang)}` : ""}.`
        : `You can do this online right here${l.dauer ? ` – it takes ${tx(l.dauer, lang)}` : ""}.`
      : l.termin
        ? deutsch(lang)
          ? "Dafür ist ein persönlicher Termin nötig. Sie können ihn direkt hier buchen."
          : "This requires an appointment in person. You can book it right here."
        : "";
  if (naechster) teile.push(naechster);
  return {
    text: teile.join("\n\n"),
    leistungId: l.id,
    aktionen: aktionenFuer(l, lang),
    quellen: l.rechtsgrundlage ? [tx(l.rechtsgrundlage, lang)] : [],
    sicher: true,
  };
}

function aspektAntwort(l: Leistung, aspekt: Aspekt, lang: Sprache): Antwort {
  const titel = tx(l.titel, lang);
  const de = deutsch(lang);
  const liste = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  let text: string;
  switch (aspekt) {
    case "gebuehren":
      text = l.gebuehren.length
        ? `${de ? "Die Gebühren für" : "Fees for"} **${titel}**:\n\n${liste(l.gebuehren.map((g) => gebuehrText(g, lang)))}`
        : de
          ? `Zu den Gebühren für **${titel}** liegen mir keine gesicherten Angaben vor. Bitte fragen Sie im Bürgerbüro nach.`
          : `I have no reliable information on fees for **${titel}**. Please ask the citizens' office.`;
      break;
    case "unterlagen":
      text = `${de ? "Für" : "For"} **${titel}** ${de ? "brauchen Sie:" : "you need:"}\n\n${liste(l.unterlagen.map((u) => tx(u, lang)))}`;
      break;
    case "fristen":
      text = l.fristen?.length
        ? `${de ? "Fristen für" : "Deadlines for"} **${titel}**:\n\n${liste(l.fristen.map((f) => tx(f, lang)))}`
        : de
          ? `Für **${titel}** ist in meinen Unterlagen keine Frist hinterlegt. Im Zweifel fragen Sie bitte im Bürgerbüro nach.`
          : `No deadline is stored for **${titel}**. If in doubt, please ask the citizens' office.`;
      break;
    case "termin":
      text = l.termin
        ? de
          ? `Ja, für **${titel}** ist ein persönlicher Termin nötig. Sie können ihn hier direkt buchen.`
          : `Yes, **${titel}** requires an appointment in person. You can book it right here.`
        : de ? `Für **${titel}** brauchen Sie keinen Termin.` : `You do not need an appointment for **${titel}**.`;
      break;
    default:
      text = `${de ? "So geht es:" : "How it works:"}\n\n${l.ablauf.map((s, i) => `${i + 1}. ${tx(s, lang)}`).join("\n")}`;
  }
  return { text, aktionen: aktionenFuer(l, lang), quellen: l.rechtsgrundlage ? [tx(l.rechtsgrundlage, lang)] : [], sicher: true };
}

function rueckfrageAntwort(r: Rueckfrage, tenant: GemeindeConfig, lang: Sprache): Antwort {
  return {
    text: tx(r.frage, lang),
    optionen: r.optionen.filter((o) => findeLeistung(tenant, o.leistungId)).map((o) => ({ label: tx(o.label, lang), leistungId: o.leistungId })),
    aktionen: [],
    quellen: [],
    sicher: true,
  };
}

function oeffnungszeitenText(tenant: GemeindeConfig, lang: Sprache): string {
  const tage = WOCHENTAGE[lang];
  return Object.entries(tenant.oeffnungszeiten)
    .map(([tag, fenster]) => `- ${tage[tag]}: ${fenster!.map(([v, b]) => `${v}–${b}`).join(", ")}`)
    .join("\n");
}

/** Grobe Erkennung anderer Sprachen (für einen freundlichen Hinweis statt einer falschen Antwort). */
function istFremdsprache(text: string): boolean {
  if (/[\u0400-\u04ff\u0600-\u06ff\u0370-\u03ff\u4e00-\u9fff\u0590-\u05ff]/.test(text)) return true;
  if (/[ğşıİĞŞąęłńśźżćőű]/.test(text)) return true;
  const w = normalisiere(text).split(" ");
  const fremd = ["je", "suis", "veux", "est", "quiero", "necesito", "una", "por", "favor", "voglio", "sono", "ben", "bir", "nasil", "jak", "chce", "prosze", "eu", "preciso"];
  return w.filter((x) => fremd.includes(x)).length >= 2;
}

export function weissNicht(tenant: GemeindeConfig, lang: Sprache): Antwort {
  const k = tenant.kontakt;
  const d = dict(lang);
  const text =
    deutsch(lang)
      ? `Dazu habe ich leider keine gesicherten Informationen. Damit Sie keine falsche Auskunft erhalten, wenden Sie sich bitte direkt an uns${k.telefon ? ` – telefonisch unter ${k.telefon}` : ""}${k.email ? ` oder per E-Mail an ${k.email}` : ""}.\n\nSie können auch einen Termin buchen.`
      : `Unfortunately I have no reliable information on this. To make sure you get correct information, please contact us directly${k.telefon ? ` by phone at ${k.telefon}` : ""}${k.email ? ` or by email at ${k.email}` : ""}.\n\nYou can also book an appointment.`;
  return {
    text,
    aktionen: [
      { typ: "kontakt", label: d.kontaktAufnehmen },
      { typ: "termin", label: d.terminBuchen },
    ],
    quellen: [],
    sicher: false,
  };
}

// ---------------------------------------------------------------------------
// Regelbasierte Antwort (funktioniert ohne Sprachmodell)
// ---------------------------------------------------------------------------

function lokaleAntwort(tenant: GemeindeConfig, a: Analyse, lang: Sprache): Antwort {
  const de = deutsch(lang);
  if (a.smalltalk === "gruss") return { text: tx(tenant.texte.begruessung, lang), aktionen: [], quellen: [], sicher: true };
  if (a.smalltalk === "dank")
    return { text: de ? "Gern geschehen. Kann ich noch etwas für Sie tun?" : "You're welcome. Is there anything else I can do?", aktionen: [], quellen: [], sicher: true };

  const n = normalisiere(a.text);
  if (/\b(oeffnungszeit\w*|geoeffnet|offen|opening hours)\b/.test(n) && !a.leistung) {
    return {
      text: `${de ? "Unsere Öffnungszeiten:" : "Our opening hours:"}\n\n${oeffnungszeitenText(tenant, lang)}${tenant.oeffnungszeitenHinweis ? `\n\n${tx(tenant.oeffnungszeitenHinweis, lang)}` : ""}`,
      aktionen: [{ typ: "kontakt", label: dict(lang).kontaktAufnehmen }],
      quellen: [],
      sicher: true,
    };
  }

  if (a.rueckfrage && !a.leistungEindeutig) return rueckfrageAntwort(a.rueckfrage, tenant, lang);

  const top = a.treffer[0];
  const wissen = top && top.score >= WISSEN_SCHWELLE && top.abdeckung >= WISSEN_ABDECKUNG ? top : undefined;
  // Bezieht sich der Wissens-Treffer auf die erkannte Leistung? (z. B. "Höhe der Hundesteuer" ↔ "Hund anmelden")
  const wissenZurLeistung =
    wissen && a.leistung && a.leistung.stichworte.some((s) => tokens(s, true).length === 1 && wissen.abschnitt.tokens.includes(tokens(s, true)[0]))
      ? wissen
      : undefined;

  // Konkrete Frage zu einer Leistung ("Was kostet ein Personalausweis?")
  if (a.leistung && a.aspekt && (a.frage || !a.leistungEindeutig)) {
    // Steht in der Wissensbasis eine genauere Antwort (z. B. Satzung), hat diese Vorrang.
    if (wissenZurLeistung && a.aspekt !== "termin" && a.aspekt !== "unterlagen") return wissensAntwort(wissenZurLeistung, a.leistung, lang);
    return aspektAntwort(a.leistung, a.aspekt, lang);
  }

  // Klarer Auftrag ("Ich möchte meinen Hund anmelden") → Leistung
  if (a.leistung && a.leistungEindeutig && !a.frage) return leistungAntwort(a.leistung, lang);

  // Informationsfrage → Wissensbasis
  if (wissen && !a.leistung) return wissensAntwort(wissen, undefined, lang);
  if (wissenZurLeistung && a.frage) return wissensAntwort(wissenZurLeistung, a.leistung, lang);
  if (wissen) return wissensAntwort(wissen, a.leistungEindeutig ? a.leistung : undefined, lang);

  // Eine offene Frage, die nur am Rande eine Leistung streift, beantworten wir nicht mit der Leistung.
  if (a.leistung && !(a.frage && !a.leistungEindeutig)) return leistungAntwort(a.leistung, lang);
  if (istFremdsprache(a.text)) {
    const sprachen = tenant.sprachen.map((s) => (s === "de" ? "Deutsch" : "English")).join(" / ");
    return {
      ...weissNicht(tenant, lang),
      text: `Leider kann ich Ihnen nur auf ${sprachen} antworten. Bitte beschreiben Sie Ihr Anliegen in einer dieser Sprachen – oder wenden Sie sich direkt an uns.\n\nUnfortunately I can only answer in ${sprachen}. Please describe your request in one of these languages or contact us directly.`,
    };
  }
  return weissNicht(tenant, lang);
}

function wissensAntwort(t: Treffer, l: Leistung | undefined, lang: Sprache): Antwort {
  return {
    text: `**${t.abschnitt.titel}**\n\n${t.abschnitt.text}`,
    aktionen: l ? aktionenFuer(l, lang) : [],
    quellen: [t.abschnitt.quelle],
    sicher: true,
  };
}

// ---------------------------------------------------------------------------
// Sprachmodell (optional)
// ---------------------------------------------------------------------------

const LlmAntwort = z.object({
  text: z.string().min(1).max(4000),
  leistungId: z.string().nullish(),
  optionen: z.array(z.string()).nullish(),
  quellen: z.array(z.string()).nullish(),
  sicher: z.boolean(),
});

function kontextFuerModell(tenant: GemeindeConfig, a: Analyse): string {
  const leistungen = aktiveLeistungen(tenant)
    .map((l) =>
      [
        `- id: ${l.id}`,
        `  Titel: ${tx(l.titel, "de")}`,
        `  Kurz: ${tx(l.kurz, "de")}`,
        `  Unterlagen: ${l.unterlagen.map((u) => tx(u, "de")).join("; ")}`,
        `  Gebühren: ${l.gebuehren.map((g) => gebuehrText(g, "de").replace(/\*\*/g, "")).join("; ") || "keine Angabe"}`,
        l.fristen?.length ? `  Fristen: ${l.fristen.map((f) => tx(f, "de")).join("; ")}` : "",
        `  Online möglich: ${l.online && l.formular ? "ja" : "nein"}; Termin nötig: ${l.termin ? "ja" : "nein"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  const wissen = a.treffer.map((t, i) => `[${i + 1}] ${t.abschnitt.titel} (Quelle: ${t.abschnitt.quelle})\n${t.abschnitt.text}`).join("\n\n");
  const k = tenant.kontakt;
  return [
    `GEMEINDE: ${tenant.art} ${tenant.name}`,
    `KONTAKT: ${tx(k.bezeichnung, "de")}, ${k.strasse}, ${k.plz} ${k.ort}, Tel. ${k.telefon ?? "–"}, E-Mail ${k.email ?? "–"}`,
    `ÖFFNUNGSZEITEN:\n${oeffnungszeitenText(tenant, "de")}`,
    `LEISTUNGEN:\n${leistungen}`,
    `WISSENSBASIS:\n${wissen || "(keine passenden Einträge gefunden)"}`,
  ].join("\n\n");
}

function systemPrompt(tenant: GemeindeConfig, lang: Sprache): string {
  return `Sie sind der digitale Bürgerservice der ${tenant.art} ${tenant.name}. Sie helfen Bürgerinnen und Bürgern, ihr Anliegen zu erledigen.

TON: freundlich, ruhig, kompetent, höflich (Sie-Form), einfache Sprache, kurze Sätze. Keine Emojis. Keine Floskeln. Antworten Sie ${ANTWORTSPRACHE[lang]}.

STRENGE REGELN:
1. Antworten Sie AUSSCHLIESSLICH auf Grundlage des KONTEXTS unten. Nutzen Sie kein Allgemeinwissen über Gebühren, Fristen, Zuständigkeiten oder Recht.
2. Nennen Sie niemals Beträge, Fristen, Paragrafen oder Rechtsauskünfte, die nicht wörtlich im KONTEXT stehen.
3. Wenn der KONTEXT die Frage nicht sicher beantwortet: Sagen Sie ehrlich "Das weiß ich nicht sicher." und setzen Sie "sicher": false.
4. Keine Rechtsberatung. Bei rechtlichen Einzelfragen auf das persönliche Gespräch verweisen.
5. Passt eine Leistung aus dem KONTEXT, geben Sie deren id in "leistungId" an. Unterlagen und Gebühren werden dann automatisch angezeigt – wiederholen Sie diese nicht vollständig.
6. Ist das Anliegen mehrdeutig, stellen Sie EINE kurze Rückfrage und geben Sie passende Leistungs-ids in "optionen" an.
7. Maximal 120 Wörter.

ANTWORTFORMAT: Nur ein JSON-Objekt, nichts davor oder danach:
{"text": "...", "leistungId": "id oder null", "optionen": ["id", ...] oder null, "quellen": ["Quelle aus der Wissensbasis", ...], "sicher": true|false}`;
}

/** Schutz gegen erfundene Beträge: Jeder €-Betrag in der Antwort muss im Kontext stehen. */
function betraegeBelegt(text: string, kontext: string): boolean {
  const norm = (s: string) => s.replace(/\./g, "").replace(",", ".");
  const imKontext = new Set([...kontext.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:€|euro|eur)/gi)].map((m) => Number(norm(m[1]))));
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:€|euro|eur)/gi)) {
    if (!imKontext.has(Number(norm(m[1])))) return false;
  }
  return true;
}

async function modellAntwort(tenant: GemeindeConfig, anfrage: AssistentAnfrage, a: Analyse): Promise<Antwort | null> {
  const provider = getProvider();
  if (!provider) return null;
  const kontext = kontextFuerModell(tenant, a);
  const verlauf = anfrage.nachrichten.slice(-8).map((m) => ({
    role: m.rolle === "buerger" ? ("user" as const) : ("assistant" as const),
    content: redact(m.text).slice(0, 1500),
  }));
  // Kontext wird an die letzte Bürgernachricht angehängt.
  verlauf[verlauf.length - 1].content = `KONTEXT:\n${kontext}\n\nANLIEGEN:\n${verlauf[verlauf.length - 1].content}`;

  try {
    const roh = await provider.complete(systemPrompt(tenant, anfrage.lang), verlauf);
    const json = roh.slice(roh.indexOf("{"), roh.lastIndexOf("}") + 1);
    const p = LlmAntwort.parse(JSON.parse(json));
    if (!betraegeBelegt(p.text, kontext)) {
      console.warn("[assistent] Modellantwort enthielt nicht belegten Betrag – verworfen.");
      return null;
    }
    const l = p.leistungId ? findeLeistung(tenant, p.leistungId) : undefined;
    const optionen = (p.optionen ?? [])
      .map((id) => findeLeistung(tenant, id))
      .filter((x): x is Leistung => !!x)
      .map((x) => ({ label: tx(x.titel, anfrage.lang), leistungId: x.id }));
    if (!p.sicher) return { ...weissNicht(tenant, anfrage.lang), text: p.text };
    return {
      text: p.text,
      leistungId: optionen.length ? undefined : l?.id,
      optionen: optionen.length ? optionen : undefined,
      aktionen: l && !optionen.length ? aktionenFuer(l, anfrage.lang) : [],
      quellen: (p.quellen ?? []).filter((q) => kontext.includes(q)).slice(0, 3),
      sicher: true,
    };
  } catch (e) {
    console.error("[assistent] Modellaufruf fehlgeschlagen, nutze regelbasierte Antwort:", (e as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hochgeladene Unterlagen: vorsortieren, Vollständigkeit prüfen, Zusammenfassung
// (Der Assistent entscheidet nie über einen Antrag – er leitet nur weiter.)
// ---------------------------------------------------------------------------

async function dokumentAntwort(tenant: GemeindeConfig, a: Analyse, entwurf: string, lang: Sprache): Promise<Antwort> {
  const de = deutsch(lang);
  const uploads = (await uploadsImEntwurf(tenant, entwurf)).sort((x, y) => x.erstelltAm.localeCompare(y.erstelltAm));
  if (!uploads.length) {
    return {
      text: de ? "Ich konnte keine hochgeladenen Unterlagen finden. Bitte fügen Sie die Dateien erneut hinzu." : "I could not find any uploaded documents. Please add the files again.",
      aktionen: [],
      quellen: [],
      sicher: false,
    };
  }
  const arten = uploads.map((u) => u.art);

  // Vorgang: aus dem Text des Bürgers, sonst aus den Unterlagen (eindeutigste Übereinstimmung)
  let leistung = a.leistung && a.leistungEindeutig ? a.leistung : undefined;
  if (!leistung) {
    const kandidaten = aktiveLeistungen(tenant)
      .map((l) => ({ l, score: (l.dokumente ?? []).reduce((s, d) => s + (arten.includes(d.art) && d.art !== "personalausweis" && d.art !== "reisepass" ? (d.pflicht ? 2 : 1) : 0), 0) }))
      .filter((k) => k.score > 0)
      .sort((x, y) => y.score - x.score);
    if (kandidaten[0] && kandidaten[0].score > (kandidaten[1]?.score ?? 0)) leistung = kandidaten[0].l;
  }

  // Zuständigkeit: Leistung → Hinweise aus den Unterlagen → Standard-Amt
  const vorschlaege = uploads.map((u) => u.amtVorschlag).filter(Boolean) as string[];
  const haeufigster = vorschlaege.sort((x, y) => vorschlaege.filter((v) => v === y).length - vorschlaege.filter((v) => v === x).length)[0];
  const amt = zustaendigesAmt(tenant, leistung?.id, haeufigster);
  const fehlend = fehlendeUnterlagen(tenant, leistung?.id, arten);
  const unsicher = uploads.filter((u) => !u.artSicher).length;

  const teile: string[] = [];
  teile.push(
    de
      ? `Vielen Dank. Ich habe ${uploads.length === 1 ? "eine Unterlage" : `${uploads.length} Unterlagen`} erhalten.`
      : `Thank you. I have received ${uploads.length === 1 ? "one document" : `${uploads.length} documents`}.`,
  );
  if (leistung) {
    teile.push(
      de
        ? `Das passt zum Vorgang **${tx(leistung.titel, lang)}**. Zuständig ist: **${tx(amt.name, lang)}**.`
        : `This matches **${tx(leistung.titel, lang)}**. Responsible office: **${tx(amt.name, lang)}**.`,
    );
  } else {
    teile.push(
      de
        ? `Zuständig ist voraussichtlich: **${tx(amt.name, lang)}**. Wenn Sie wissen, worum es geht, wählen Sie unten bitte den passenden Vorgang.`
        : `The responsible office is probably **${tx(amt.name, lang)}**. If you know what it is about, please choose the matching request below.`,
    );
  }
  if (fehlend.length) {
    teile.push(
      (de ? "Für diesen Vorgang fehlt noch:\n" : "Still missing for this request:\n") +
        fehlend.map((f) => `- ${artLabel(tenant, f.art, lang)}${f.hinweis ? ` (${tx(f.hinweis, lang)})` : ""}`).join("\n") +
        (de ? "\n\nSie können die Unterlagen jetzt ergänzen oder trotzdem absenden." : "\n\nYou can add them now or send anyway."),
    );
  }
  if (unsicher)
    teile.push(
      de
        ? `Bei ${unsicher === 1 ? "einer Unterlage" : `${unsicher} Unterlagen`} bin ich mir bei der Art nicht sicher. Bitte prüfen Sie die Angabe in der Zusammenfassung.`
        : `I am not sure about the type of ${unsicher} document(s). Please check in the summary.`,
    );
  teile.push(
    de
      ? "Bitte prüfen Sie die Zusammenfassung. Erst wenn Sie bestätigen, senden wir alles an das Amt. Über Ihr Anliegen entscheidet das Amt."
      : "Please check the summary. Nothing is sent until you confirm. The office decides on your request.",
  );

  return {
    text: teile.join("\n\n"),
    aktionen: [],
    quellen: [],
    sicher: true,
    einreichung: {
      leistungId: leistung?.id,
      amtId: amt.id,
      dokumente: uploads.map((u) => ({
        id: u.id,
        art: u.art,
        artSicher: u.artSicher,
        name: decryptJson<string>(u.name),
        typ: u.typ,
        groesse: u.groesse,
        seiten: u.seiten,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Einstiegspunkt
// ---------------------------------------------------------------------------

export async function beantworte(tenant: GemeindeConfig, anfrage: AssistentAnfrage): Promise<Antwort> {
  const lang = anfrage.lang;

  if (anfrage.leistungId) {
    const l = findeLeistung(tenant, anfrage.leistungId);
    return l ? leistungAntwort(l, lang) : weissNicht(tenant, lang);
  }

  const letzte = [...anfrage.nachrichten].reverse().find((m) => m.rolle === "buerger")?.text ?? "";
  const a = await analysiere(tenant, letzte, anfrage.kontextLeistungId);

  if (anfrage.entwurf && anfrage.dokumente?.length) return dokumentAntwort(tenant, a, anfrage.entwurf, lang);

  // Portal-Dienste (Abfall, Mängelmelder, Lebenslagen …): wenn keine Leistung passt –
  // oder wenn eine Wortgruppe eindeutig auf einen Dienst zeigt („Ist mein Ausweis fertig?“).
  // Ein genauer Treffer in der Wissensbasis hat bei Einzelwörtern Vorrang („Hundemarke verloren“).
  const d = a.smalltalk ? undefined : dienstAntwort(tenant, letzte, lang);
  const top = a.treffer[0];
  const wissenGut = !!top && top.score >= WISSEN_SCHWELLE && top.abdeckung >= WISSEN_ABDECKUNG;
  const lebenslage = d?.aktionen[0]?.typ === "link" && d.aktionen[0].url.startsWith("/lebenslagen/") ? d.aktionen[0] : undefined;
  if (d && !(a.rueckfrage && lebenslage)) {
    const passt = d.mehrwort ? !a.leistungEindeutig : !a.leistung && !a.rueckfrage && !wissenGut;
    if (passt) {
      const { mehrwort: _, ...antwort } = d;
      return antwort;
    }
  }

  // Eindeutige Fälle beantworten wir deterministisch aus der Konfiguration.
  const eindeutig = a.smalltalk || a.rueckfrage || (a.leistung && a.leistungEindeutig && !a.frage);
  if (!eindeutig) {
    const m = await modellAntwort(tenant, anfrage, a);
    if (m) return m;
  }
  const r = lokaleAntwort(tenant, a, lang);
  // Rückfrage zu einer Lebenslage (z. B. Umzug): passende Checkliste zusätzlich anbieten
  if (lebenslage && r.optionen?.length) r.aktionen = [...r.aktionen, lebenslage];
  return r;
}
