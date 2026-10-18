/**
 * Geplante Aufgaben (täglich per Cron, siehe /api/cron und vercel.json):
 *  - Erinnerung am Vorabend der Müllabfuhr (Push nach Bezirk)
 *  - Fristen in Lebenslagen-Checklisten (Push + E-Mail ohne Inhalt)
 *  - Ablaufender Personalausweis (E-Mail, 90 und 30 Tage vorher)
 *  - „Was steht bei mir an?“: neue Hinweise (Stichtage, Kinder, Reisepass) per Push/E-Mail
 *  - Wiedervorlagen und Fristen: Übersicht an Sachbearbeiter/innen (ohne Personendaten)
 *  - Löschfristen
 * Jede Aufgabe läuft pro Tag höchstens einmal (Merker in "cronlaeufe").
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { abfuhren } from "@/lib/abfall/kalender";
import { decryptJson } from "@/lib/crypto";
import { plusTage } from "@/lib/feiertage";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { checklisteSicht, inhalt, speichereCheckliste } from "@/lib/lebenslagen/service";
import { sendMail } from "@/lib/mail";
import { benachrichtige } from "@/lib/push/service";
import type { ChecklisteRecord, CronLaufRecord, KontoRecord, TerminRecord, VorgangRecord } from "@/lib/records";
import { benutzerListe, darfAmt } from "@/lib/backoffice/auth";
import { zustaendigFuer } from "@/lib/backoffice/vertretung";
import { hinweiseFuer } from "@/lib/konto/uebersicht";
import { fristlage } from "@/lib/vorgaenge/fristen";
import { sichereAuslastung } from "@/lib/auslastung/service";
import { inTagen, store } from "@/lib/storage/store";
import type { Profil } from "@/lib/konto/types";
import { loescheAbgelaufene } from "@/lib/vorgaenge/service";

export function heuteBerlin(d = new Date()): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}
function stundeBerlin(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Berlin" }).format(d));
}

/** Führt fn nur aus, wenn die Aufgabe mit diesem Schlüssel noch nicht gelaufen ist. */
async function einmal(tenant: string, schluessel: string, fn: () => Promise<number>): Promise<number | "schon_erledigt"> {
  const id = `${tenant}:${schluessel}`;
  if (await store().get<CronLaufRecord>("cronlaeufe", id)) return "schon_erledigt";
  const ergebnis = await fn();
  await store().put<CronLaufRecord>("cronlaeufe", { id, tenant, aufgabe: schluessel, ergebnis, erstelltAm: new Date().toISOString(), loeschenAm: inTagen(14) });
  return ergebnis;
}

export async function abfallErinnerung(tenant: GemeindeConfig, jetzt = new Date()) {
  if (!aktiv(tenant, "abfall") || !aktiv(tenant, "push") || !tenant.abfall) return 0;
  // Nur am Nachmittag/Abend – eine Erinnerung um 7 Uhr morgens für „morgen“ wäre verwirrend.
  if (stundeBerlin(jetzt) < 15) return 0;
  const morgen = plusTage(heuteBerlin(jetzt), 1);
  const cfg = tenant.abfall;
  return einmal(tenant.slug, `abfall:${morgen}`, async () => {
    let n = 0;
    for (const b of cfg.bezirke) {
      const arten = abfuhren(cfg, b, morgen, morgen).map((a) => tx(cfg.arten.find((x) => x.id === a.art)?.label ?? a.art, "de"));
      if (!arten.length) continue;
      n += await benachrichtige(tenant, {
        thema: "abfall",
        abfallBezirk: b.id,
        titel: `Morgen: ${arten.join(", ")}`,
        text: "Bitte stellen Sie die Behälter bis 6 Uhr an die Straße.",
        url: "/abfall",
      });
    }
    return n;
  });
}

export async function checklistenErinnerung(tenant: GemeindeConfig, jetzt = new Date()) {
  if (!aktiv(tenant, "lebenslagen")) return 0;
  const heute = heuteBerlin(jetzt);
  const grenze = plusTage(heute, 3);
  return einmal(tenant.slug, `checklisten:${heute}`, async () => {
    let n = 0;
    const alle = await store().list<ChecklisteRecord>("checklisten", (c) => c.tenant === tenant.slug);
    for (const c of alle) {
      const sicht = checklisteSicht(tenant, c);
      const i = inhalt(c);
      if (!sicht) continue;
      const faellig = sicht.schritte.filter((s) => !s.erledigt && s.frist && s.frist >= heute && s.frist <= grenze && !i.erinnert.includes(s.id));
      if (!faellig.length) continue;
      const k = await store().get<KontoRecord>("konten", c.kontoId);
      if (!k) continue;
      await benachrichtige(tenant, {
        kontoIds: [k.id],
        titel: "Frist in Ihrer Checkliste",
        text: faellig.length === 1 ? `„${faellig[0].titel}“ steht an.` : `${faellig.length} Schritte stehen in den nächsten Tagen an.`,
        url: `/lebenslagen/${sicht.lebenslageId}`,
      });
      if (k.einstellungen.emailBenachrichtigung) {
        const email = decryptJson<Profil>(k.profil).email;
        // Inhalt bewusst allgemein: Lebenslagen (z. B. Geburt) gehören nicht in eine E-Mail.
        if (email)
          await sendMail(tenant, {
            to: email,
            subject: "Erinnerung: Frist in Ihrer Checkliste",
            text: `Guten Tag,\n\nin einer Ihrer Checklisten im Bürgerkonto steht in den nächsten Tagen eine Frist an.\n\nBitte melden Sie sich im Portal an, um die Einzelheiten zu sehen.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
          }).catch(() => undefined);
      }
      await speichereCheckliste(k, { ...i, erinnert: [...i.erinnert, ...faellig.map((s) => s.id)] }, c.id, c.erstelltAm);
      n++;
    }
    return n;
  });
}

export async function ausweisErinnerung(tenant: GemeindeConfig, jetzt = new Date()) {
  const heute = heuteBerlin(jetzt);
  return einmal(tenant.slug, `ausweis:${heute}`, async () => {
    let n = 0;
    const konten = await store().list<KontoRecord>("konten", (k) => k.tenant === tenant.slug);
    for (const k of konten) {
      const p = decryptJson<Profil>(k.profil);
      if (!p.ausweisGueltigBis || !p.email || !k.einstellungen.emailBenachrichtigung) continue;
      const tage = Math.round((Date.parse(p.ausweisGueltigBis + "T00:00:00Z") - Date.parse(heute + "T00:00:00Z")) / 86400_000);
      const stufe = tage <= 30 && tage >= 0 ? 30 : tage <= 90 && tage > 30 ? 90 : undefined;
      if (!stufe) continue;
      const merker = `ausweis-${stufe}:${p.ausweisGueltigBis}`;
      if (k.erinnerungen?.includes(merker)) continue;
      await sendMail(tenant, {
        to: p.email,
        subject: "Ihr Personalausweis läuft bald ab",
        text: `Guten Tag ${p.vorname},\n\nlaut Ihrem Bürgerkonto läuft Ihr Personalausweis in ${tage} Tagen ab. Für einen neuen Ausweis sollten Sie etwa vier Wochen einplanen.\n\nEinen Termin im Bürgerbüro können Sie online buchen.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
      }).catch(() => undefined);
      await benachrichtige(tenant, { kontoIds: [k.id], titel: "Ausweis läuft bald ab", text: `Noch ${tage} Tage gültig – jetzt Termin buchen.`, url: "/termine?leistung=personalausweis" });
      await store().put("konten", { ...k, erinnerungen: [...(k.erinnerungen ?? []).slice(-10), merker] });
      n++;
    }
    return n;
  });
}

/** Erinnerung am Vortag eines gebuchten Termins (E-Mail an die Buchungsadresse, Push ans Konto). */
export async function terminErinnerung(tenant: GemeindeConfig, jetzt = new Date()) {
  const morgen = plusTage(heuteBerlin(jetzt), 1);
  return einmal(tenant.slug, `termine:${morgen}`, async () => {
    let n = 0;
    const termine = await store().list<TerminRecord>("termine", (t) => t.tenant === tenant.slug && t.status === "gebucht" && t.slot.startsWith(morgen));
    for (const t of termine) {
      const amt = tenant.aemter.find((a) => a.id === t.amtId);
      const leistung = tenant.leistungen.find((l) => l.id === t.leistungId);
      const zeit = t.slot.slice(11);
      const d = decryptJson<{ name: string; email: string }>(t.daten);
      const wo = t.videoLink ? `per Video: ${t.videoLink}` : `${amt ? tx(amt.name, "de") : ""}${amt?.ort ? `, ${tx(amt.ort, "de")}` : ""}`;
      await sendMail(tenant, {
        to: d.email,
        subject: `Erinnerung: Ihr Termin morgen um ${zeit} Uhr`,
        text: [
          `Guten Tag ${d.name},`,
          "",
          `morgen um ${zeit} Uhr haben Sie Ihren Termin ${wo}.`,
          !t.videoLink && leistung?.unterlagen.length ? `\nBitte denken Sie an:\n${leistung.unterlagen.map((u) => `- ${tx(u, "de")}`).join("\n")}` : "",
          "",
          "Sie können nicht? Bitte sagen Sie den Termin unter „Meine Anliegen“ ab – dann kann jemand anderes ihn nutzen.",
          "",
          "Freundliche Grüße",
          tenant.email.absenderName,
        ].join("\n"),
      }).catch(() => undefined);
      if (t.kontoId) await benachrichtige(tenant, { kontoIds: [t.kontoId], titel: `Morgen, ${zeit} Uhr: Ihr Termin`, text: t.videoLink ? "Video-Beratung – den Link finden Sie unter „Meine Anliegen“." : "Unterlagen-Check unter „Meine Anliegen“.", url: "/meine-anliegen" });
      n++;
    }
    return n;
  });
}

/**
 * Neue persönliche Hinweise (nur Quellen ohne eigene Erinnerung: Stichtage, Kinder, Reisepass).
 * E-Mail bewusst ohne Inhalt – Kinder oder Grundbesitz gehören nicht in eine E-Mail.
 */
export async function hinweisErinnerung(tenant: GemeindeConfig, jetzt = new Date()) {
  if (!aktiv(tenant, "konto") || !aktiv(tenant, "hinweise")) return 0;
  const heute = heuteBerlin(jetzt);
  return einmal(tenant.slug, `hinweise:${heute}`, async () => {
    let n = 0;
    for (const k of await store().list<KontoRecord>("konten", (x) => x.tenant === tenant.slug)) {
      const neu = (await hinweiseFuer(tenant, k, heute)).filter((h) => h.erinnern && !k.erinnerungen?.includes(`h:${h.id}`));
      if (!neu.length) continue;
      await benachrichtige(tenant, { kontoIds: [k.id], titel: neu.length === 1 ? neu[0].titel : `${neu.length} neue Hinweise`, text: "Was steht bei mir an? – jetzt im Bürgerkonto ansehen.", url: "/konto" });
      if (k.einstellungen.emailBenachrichtigung) {
        const email = decryptJson<Profil>(k.profil).email;
        if (email)
          await sendMail(tenant, {
            to: email,
            subject: neu.length === 1 ? "Ein neuer Hinweis in Ihrem Bürgerkonto" : `${neu.length} neue Hinweise in Ihrem Bürgerkonto`,
            text: `Guten Tag,\n\nin Ihrem Bürgerkonto gibt es ${neu.length === 1 ? "einen neuen Hinweis" : `${neu.length} neue Hinweise`} unter „Was steht bei mir an?“ – zum Beispiel eine Frist, die bald endet.\n\nBitte melden Sie sich im Portal an, um die Einzelheiten zu sehen.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
          }).catch(() => undefined);
      }
      await store().put("konten", { ...k, erinnerungen: [...(k.erinnerungen ?? []), ...neu.map((h) => `h:${h.id}`)].slice(-60) });
      n++;
    }
    return n;
  });
}

/** Morgens: je Sachbearbeiter/in eine Übersicht fälliger Wiedervorlagen und Fristen – nur Zahlen und Vorgangsnummern. */
export async function wiedervorlageUebersicht(tenant: GemeindeConfig, jetzt = new Date()) {
  if (stundeBerlin(jetzt) < 6) return 0;
  const heute = heuteBerlin(jetzt);
  const wt = new Date(heute + "T12:00:00Z").getUTCDay();
  if (wt === 0 || wt === 6) return 0;
  return einmal(tenant.slug, `wiedervorlage:${heute}`, async () => {
    const offen = (await store().list<VorgangRecord>("vorgaenge", (v) => v.tenant === tenant.slug && v.status !== "erledigt")).map((v) => ({ v, fl: fristlage(tenant, v, heute)! }));
    let n = 0;
    for (const b of benutzerListe().filter((x) => x.email && (x.gemeinde === "*" || x.gemeinde === tenant.slug))) {
      const fuer = await zustaendigFuer(tenant, b.name);
      const meine = offen.filter(({ v }) => darfAmt(b, v.amtId) && !!v.zugewiesen && fuer.includes(v.zugewiesen));
      const wv = meine.filter(({ fl }) => fl.wiedervorlageFaellig);
      const ueber = meine.filter(({ fl }) => fl.ueberfaellig);
      const bald = meine.filter(({ fl }) => fl.bald);
      if (!wv.length && !ueber.length && !bald.length) continue;
      const zeile = (titel: string, l: typeof meine) => (l.length ? `${titel} (${l.length}): ${l.map(({ v }) => v.id).join(", ")}` : "");
      await sendMail(tenant, {
        to: b.email!,
        subject: `Heute: ${wv.length} Wiedervorlage${wv.length === 1 ? "" : "n"}, ${ueber.length} über der Frist`,
        text: [`Guten Morgen ${b.name},`, "", zeile("Wiedervorlage heute", wv), zeile("Frist überschritten", ueber), zeile("Frist endet in 0–2 Werktagen", bald), "", "Einzelheiten im Backoffice unter „Vorgänge“ → Filter „Frist“."]
          .filter((x, i, a) => x !== "" || a[i - 1] !== "")
          .join("\n"),
      }).catch(() => undefined);
      n++;
    }
    return n;
  });
}

/** Alle Aufgaben für alle Gemeinden. */
export async function taeglich(alle: GemeindeConfig[], jetzt = new Date()) {
  const ergebnis: Record<string, Record<string, number | string>> = {};
  for (const t of alle) {
    ergebnis[t.slug] = {
      abfall: await abfallErinnerung(t, jetzt),
      checklisten: await checklistenErinnerung(t, jetzt),
      ausweis: await ausweisErinnerung(t, jetzt),
      termine: await terminErinnerung(t, jetzt),
      hinweise: await hinweisErinnerung(t, jetzt),
      wiedervorlage: await wiedervorlageUebersicht(t, jetzt),
      auslastung: await sichereAuslastung(t, jetzt),
    };
  }
  ergebnis.loeschung = { entfernt: await loescheAbgelaufene() };
  return ergebnis;
}
