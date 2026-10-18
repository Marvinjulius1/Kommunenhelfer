/**
 * „Was steht bei mir an?“ – persönliche Hinweise im Bürgerkonto.
 *
 * Das Portal meldet sich von selbst: Ausweis läuft ab, Hundesteuer ist fällig,
 * das Kind wird 3. Grundlage sind nur Angaben, die der Bürger selbst gemacht hat
 * (Profil, „Mein Haushalt“), seine Anliegen und die Stichtage der Gemeinde.
 * Reine Funktion – gemeinsam für Dashboard, Cron und Tests.
 */
import type { GemeindeConfig } from "@/config/types";
import { abfuhren } from "@/lib/abfall/kalender";
import { plusTage } from "@/lib/feiertage";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import type { Profil } from "./types";

export interface Hinweis {
  /** Enthält das Datum – so erscheint Wiederkehrendes im nächsten Jahr neu, auch wenn es ausgeblendet wurde */
  id: string;
  art: "aufgabe" | "frist" | "termin" | "info";
  titel: string;
  text?: string;
  /** ISO-Datum, auf das sich der Hinweis bezieht */
  datum?: string;
  href?: string;
  link?: string;
  wichtig?: boolean;
  /** Aufgaben (Rückfrage, offene Zahlung) verschwinden erst, wenn sie erledigt sind */
  ausblendbar: boolean;
  /** Kommt aus einer Quelle, die nicht schon eine eigene Erinnerung hat → Cron benachrichtigt */
  erinnern?: boolean;
}

export interface HinweisDaten {
  profil: Profil;
  vorgaenge: { id: string; status: string; leistungId?: string; erstelltAm: string }[];
  termine: { id: string; status: string; slot: string; amtId: string; leistungId?: string; videoLink?: string }[];
  zahlungen: { id: string; betragCent: number; zweck: string; url: string }[];
  checklisten: { lebenslageId: string; titel: string; schritte: { id: string; titel: string; erledigt: boolean; frist?: string }[] }[];
  abfallBezirk?: string;
  ausgeblendet?: string[];
}

const tageZwischen = (von: string, bis: string) => Math.round((Date.parse(bis + "T00:00:00Z") - Date.parse(von + "T00:00:00Z")) / 86_400_000);

/** Geburtstag mit n Jahren ("JJJJ-MM-TT"); der 29.02. fällt in Nicht-Schaltjahren auf den 01.03. */
export function geburtstag(geburtsdatum: string, jahre: number): string {
  const j = Number(geburtsdatum.slice(0, 4)) + jahre;
  const md = geburtsdatum.slice(5);
  const schalt = (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
  return md === "02-29" && !schalt ? `${j}-03-01` : `${j}-${md}`;
}

/** Nächstes Vorkommen eines Stichtags ab heute ("MM-TT" jährlich, "JJJJ-MM-TT" einmalig). */
export function naechstesDatum(d: string, heute: string): string | undefined {
  if (d.length === 10) return d >= heute ? d : undefined;
  const diesesJahr = `${heute.slice(0, 4)}-${d}`;
  return diesesJahr >= heute ? diesesJahr : `${Number(heute.slice(0, 4)) + 1}-${d}`;
}

const fmtDatum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const inTagenText = (t: number) => (t === 0 ? "heute" : t === 1 ? "morgen" : t < 0 ? `seit ${-t} Tag${t === -1 ? "" : "en"}` : `in ${t} Tagen`);

export function berechneHinweise(tenant: GemeindeConfig, d: HinweisDaten, heute: string): Hinweis[] {
  const h: Hinweis[] = [];
  const p = d.profil;
  const leistung = (id?: string) => (id ? tenant.leistungen.find((l) => l.id === id && l.aktiv) : undefined);
  const titelVon = (id?: string) => {
    const l = leistung(id);
    return l ? tx(l.titel, "de") : "Ihr Anliegen";
  };

  // --- Aufgaben aus laufenden Anliegen ---------------------------------
  for (const v of d.vorgaenge.filter((x) => x.status === "rueckfrage"))
    h.push({ id: `rueckfrage:${v.id}`, art: "aufgabe", titel: "Das Amt hat eine Rückfrage", text: `${titelVon(v.leistungId)} (${v.id})`, href: "/meine-anliegen", link: "Antworten", wichtig: true, ausblendbar: false });
  for (const z of d.zahlungen)
    h.push({
      id: `zahlung:${z.id}`,
      art: "aufgabe",
      titel: `Offene Gebühr: ${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(z.betragCent / 100)}`,
      text: z.zweck.split(" – ")[0],
      href: z.url,
      link: "Jetzt bezahlen",
      ausblendbar: false,
    });

  // --- Termine in den nächsten 7 Tagen ----------------------------------
  for (const t of d.termine) {
    const tag = t.slot.slice(0, 10);
    const in7 = tageZwischen(heute, tag);
    if (t.status !== "gebucht" || in7 < 0 || in7 > 7) continue;
    const amt = tenant.aemter.find((a) => a.id === t.amtId);
    h.push({
      id: `termin:${t.id}`,
      art: "termin",
      titel: `Termin ${inTagenText(in7)}, ${t.slot.slice(11)} Uhr`,
      text: [leistung(t.leistungId) ? tx(leistung(t.leistungId)!.titel, "de") : undefined, t.videoLink ? "Video-Beratung" : amt ? tx(amt.name, "de") : undefined].filter(Boolean).join(" · "),
      datum: tag,
      href: "/meine-anliegen",
      link: t.videoLink ? "Zum Videoraum" : "Unterlagen prüfen",
      ausblendbar: false,
    });
  }

  // --- Ausweisdokumente --------------------------------------------------
  const dokument = (art: "ausweis" | "reisepass", bis: string | undefined) => {
    if (!bis) return;
    const t = tageZwischen(heute, bis);
    if (t > 120) return;
    const name = art === "ausweis" ? "Personalausweis" : "Reisepass";
    h.push({
      id: `${art}:${bis}`,
      art: "frist",
      titel: t < 0 ? `Ihr ${name} ist abgelaufen` : `Ihr ${name} läuft ${inTagenText(t)} ab`,
      text: "Für ein neues Dokument sollten Sie etwa 4 Wochen einplanen. Den Antrag stellen Sie persönlich im Bürgerbüro.",
      datum: bis,
      href: `/termine?leistung=${art === "ausweis" ? "personalausweis" : "reisepass"}`,
      link: "Termin buchen",
      wichtig: t <= 30,
      ausblendbar: true,
      // Personalausweis hat eine eigene Erinnerung (90/30 Tage)
      erinnern: art === "reisepass",
    });
  };
  dokument("ausweis", p.ausweisGueltigBis);
  dokument("reisepass", p.reisepassGueltigBis);

  // --- Kinder ------------------------------------------------------------
  const kitaLeistung = leistung("kita-anmeldung");
  // Mit Kita-Börse dorthin, sonst zum Online-Antrag
  const kitaHref = tenant.kitas?.length && aktiv(tenant, "kita") ? "/kita" : "/antrag/kita-anmeldung";
  const kitaBeantragt = d.vorgaenge.some((v) => v.leistungId === "kita-anmeldung" && tageZwischen(v.erstelltAm.slice(0, 10), heute) < 365);
  for (const k of p.kinder ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k.geburtsdatum)) continue;
    const name = k.vorname || "Ihr Kind";
    const geb = (n: number) => geburtstag(k.geburtsdatum, n);
    const bis = (n: number) => tageZwischen(heute, geb(n));

    if (kitaLeistung && !kitaBeantragt) {
      // Rechtsanspruch auf Betreuung ab dem 1. Geburtstag (§ 24 SGB VIII) – Anmeldung idealerweise 6–9 Monate vorher
      if (bis(1) >= 0 && bis(1) <= 270)
        h.push({ id: `kita1:${k.vorname}:${geb(1)}`, art: "info", titel: `${name} wird am ${fmtDatum(geb(1))} ein Jahr alt`, text: "Ab dem 1. Geburtstag besteht ein Anspruch auf einen Betreuungsplatz. Viele Kitas vergeben Plätze Monate im Voraus – ist der Platz schon angemeldet?", datum: geb(1), href: kitaHref, link: "Kita-Platz anmelden", ausblendbar: true, erinnern: true });
      if (bis(3) >= 0 && bis(3) <= 180)
        h.push({ id: `kita3:${k.vorname}:${geb(3)}`, art: "info", titel: `${name} wird am ${fmtDatum(geb(3))} drei Jahre alt`, text: "Steht der Wechsel in den Kindergarten an? Ist der Kita-Platz schon angemeldet?", datum: geb(3), href: kitaHref, link: "Kita-Platz anmelden", ausblendbar: true, erinnern: true });
    }
    // Einschulung: Anmeldung meist im Jahr vor der Einschulung bei der Grundschule
    if (bis(6) >= 0 && bis(6) <= 365)
      h.push({ id: `schule:${k.vorname}:${geb(6)}`, art: "info", titel: `${name} kommt bald in die Schule`, text: "Die Anmeldung erfolgt bei der zuständigen Grundschule. Die Schule schreibt Sie in der Regel an – achten Sie auf die Fristen.", datum: geb(6), ausblendbar: true, erinnern: true });
    // Ausweispflicht ab 16 (§ 1 PAuswG)
    if (bis(16) >= -30 && bis(16) <= 90)
      h.push({ id: `ausweis16:${k.vorname}:${geb(16)}`, art: "frist", titel: `${name} wird 16 – ab dann ist ein Ausweis Pflicht`, text: "Ab 16 Jahren muss man einen Personalausweis oder Reisepass besitzen. Der Antrag wird persönlich im Bürgerbüro gestellt.", datum: geb(16), href: "/termine?leistung=personalausweis", link: "Termin buchen", ausblendbar: true, erinnern: true });
  }

  // --- Stichtage der Gemeinde (Hundesteuer, Grundsteuer, Wahlen …) -------
  for (const s of tenant.stichtage ?? []) {
    const betrifft = s.fuer === "alle" || (s.fuer === "hund" && p.hund) || (s.fuer === "grundbesitz" && p.grundbesitz) || (s.fuer === "kinder" && !!p.kinder?.length);
    if (!betrifft) continue;
    const naechstes = s.daten
      .map((x) => naechstesDatum(x, heute))
      .filter((x): x is string => !!x)
      .sort()[0];
    if (!naechstes || tageZwischen(heute, naechstes) > s.vorlaufTage) continue;
    h.push({
      id: `stichtag:${s.id}:${naechstes}`,
      art: "frist",
      titel: `${tx(s.titel, "de")} – ${tageZwischen(heute, naechstes) <= 1 ? inTagenText(tageZwischen(heute, naechstes)) : `am ${fmtDatum(naechstes)}`}`,
      text: s.text ? tx(s.text, "de") : undefined,
      datum: naechstes,
      href: s.href,
      link: s.link ? tx(s.link, "de") : s.href ? "Mehr erfahren" : undefined,
      wichtig: tageZwischen(heute, naechstes) <= 3,
      ausblendbar: true,
      erinnern: true,
    });
  }

  // --- Lebenslagen-Checklisten (Fristen in 7 Tagen) ----------------------
  const bald = plusTage(heute, 7);
  for (const c of d.checklisten)
    for (const sc of c.schritte)
      if (!sc.erledigt && sc.frist && sc.frist <= bald)
        h.push({
          id: `checkliste:${c.lebenslageId}:${sc.id}`,
          art: "frist",
          titel: sc.frist < heute ? `Überfällig: ${sc.titel}` : `${sc.titel} – bis ${fmtDatum(sc.frist)}`,
          text: c.titel,
          datum: sc.frist,
          href: `/lebenslagen/${c.lebenslageId}`,
          link: "Zur Checkliste",
          wichtig: sc.frist < heute,
          ausblendbar: false,
        });

  // --- Müllabfuhr morgen ---------------------------------------------------
  const bezirk = tenant.abfall?.bezirke.find((b) => b.id === d.abfallBezirk);
  if (tenant.abfall && bezirk) {
    const morgen = plusTage(heute, 1);
    const arten = abfuhren(tenant.abfall, bezirk, morgen, morgen).map((a) => tx(tenant.abfall!.arten.find((x) => x.id === a.art)?.label ?? a.art, "de"));
    if (arten.length) h.push({ id: `abfall:${morgen}`, art: "termin", titel: `Morgen wird abgeholt: ${arten.join(", ")}`, text: "Bitte stellen Sie die Behälter bis 6 Uhr an die Straße.", datum: morgen, href: "/abfall", link: "Abfallkalender", ausblendbar: true });
  }

  const aus = new Set(d.ausgeblendet ?? []);
  return h
    .filter((x) => !x.ausblendbar || !aus.has(x.id))
    .sort((a, b) => Number(!!b.wichtig) - Number(!!a.wichtig) || (a.datum ?? heute).localeCompare(b.datum ?? heute));
}
