/**
 * Geplante Aufgaben (täglich per Cron, siehe /api/cron und vercel.json):
 *  - Erinnerung am Vorabend der Müllabfuhr (Push nach Bezirk)
 *  - Fristen in Lebenslagen-Checklisten (Push + E-Mail ohne Inhalt)
 *  - Ablaufender Personalausweis (E-Mail, 90 und 30 Tage vorher)
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
import type { ChecklisteRecord, CronLaufRecord, KontoRecord } from "@/lib/records";
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

/** Alle Aufgaben für alle Gemeinden. */
export async function taeglich(alle: GemeindeConfig[], jetzt = new Date()) {
  const ergebnis: Record<string, Record<string, number | string>> = {};
  for (const t of alle) {
    ergebnis[t.slug] = {
      abfall: await abfallErinnerung(t, jetzt),
      checklisten: await checklistenErinnerung(t, jetzt),
      ausweis: await ausweisErinnerung(t, jetzt),
    };
  }
  ergebnis.loeschung = { entfernt: await loescheAbgelaufene() };
  return ergebnis;
}
