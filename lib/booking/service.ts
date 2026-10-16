/** Buchungslogik (Server). */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { aktiv } from "@/lib/funktionen";
import { decryptJson, encryptJson, hashToken, safeEqualHex, vorgangsnummer, zugangscode } from "@/lib/crypto";
import { ics, sendMail } from "@/lib/mail";
import { tx } from "@/lib/i18n";
import type { TerminRecord } from "@/lib/records";
import { inTagen, store } from "@/lib/storage/store";
import { findeLeistung } from "@/lib/tenant";
import { zaehle } from "@/lib/statistik";
import { berechneSlots, berlinZuDate } from "./slots";

/** Anzahl gebuchter Termine je Slot. */
export async function belegung(tenant: string, amtId: string): Promise<Map<string, number>> {
  const termine = await store().list<TerminRecord>("termine", (t) => t.tenant === tenant && t.amtId === amtId && t.status === "gebucht");
  const m = new Map<string, number>();
  for (const t of termine) m.set(t.slot, (m.get(t.slot) ?? 0) + 1);
  return m;
}

// Buchungen werden nacheinander verarbeitet, damit ein Slot nicht doppelt vergeben wird.
let kette: Promise<unknown> = Promise.resolve();
function seriell<T>(fn: () => Promise<T>): Promise<T> {
  const p = kette.then(fn, fn);
  kette = p.catch(() => undefined);
  return p;
}

export interface Buchung {
  amtId: string;
  leistungId?: string;
  slot: string;
  name: string;
  email: string;
  hinweis?: string;
  kontoId?: string;
  /** Video-Beratung statt Termin vor Ort (wenn das Amt das anbietet) */
  video?: boolean;
}

export async function buche(tenant: GemeindeConfig, b: Buchung) {
  const amt = tenant.aemter.find((a) => a.id === b.amtId);
  if (!amt?.termine) return { fehler: "amt_unbekannt" as const };
  const slotMinuten = amt.termine.slotMinuten;
  const leistung = b.leistungId ? findeLeistung(tenant, b.leistungId) : undefined;
  // Video: zufälliger, nicht erratbarer Raumname auf dem Jitsi-Server der Gemeinde (EU)
  const videoLink =
    b.video && aktiv(tenant, "videoBeratung") && tenant.videoBeratung?.aemter.includes(amt.id)
      ? `${tenant.videoBeratung.url.replace(/\/$/, "")}/${tenant.slug}-${randomBytes(12).toString("base64url")}`
      : undefined;

  const ergebnis = await seriell(async () => {
    const frei = berechneSlots(tenant, amt, await belegung(tenant.slug, amt.id));
    if (!frei.some((s) => s.id === b.slot)) return null;
    const id = vorgangsnummer(tenant.slug).replace(/^(\w+)-/, "$1-T-");
    const code = zugangscode();
    const [datum] = b.slot.split("T");
    const record: TerminRecord = {
      id,
      tenant: tenant.slug,
      amtId: amt.id,
      kontoId: b.kontoId,
      videoLink,
      leistungId: leistung?.id,
      slot: b.slot,
      status: "gebucht",
      tokenHash: hashToken(code),
      daten: encryptJson({ name: b.name, email: b.email, hinweis: b.hinweis }),
      erstelltAm: new Date().toISOString(),
      // Löschkonzept: 14 Tage nach dem Termin
      loeschenAm: inTagen(14, new Date(datum + "T23:59:59Z")),
    };
    await store().put("termine", record);
    return { id, code };
  });
  if (!ergebnis) return { fehler: "slot_vergeben" as const };
  await zaehle(tenant.slug, "termine", 1, leistung?.id);

  const [datum, zeit] = b.slot.split("T");
  const start = berlinZuDate(datum, zeit);
  const datumText = new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeZone: "Europe/Berlin" }).format(start);
  const titel = `Termin: ${tx(amt.name, "de")}${leistung ? ` – ${tx(leistung.titel, "de")}` : ""}`;
  const ort = videoLink ? `Video-Beratung: ${videoLink}` : `${tx(amt.ort, "de")}, ${tenant.kontakt.strasse}, ${tenant.kontakt.plz} ${tenant.kontakt.ort}`;

  await sendMail(tenant, {
    to: b.email,
    subject: `Terminbestätigung ${datumText}, ${zeit} Uhr`,
    text: [
      `Guten Tag ${b.name},`,
      "",
      `Ihr Termin ist gebucht:`,
      "",
      `${datumText}, ${zeit} Uhr`,
      ort,
      leistung ? `Anliegen: ${tx(leistung.titel, "de")}` : "",
      "",
      videoLink ? "So nehmen Sie teil: Öffnen Sie zur Terminzeit den Link oben im Browser (Kamera und Mikrofon erlauben). Eine Installation ist nicht nötig." : "",
      !videoLink && leistung?.unterlagen.length ? "Bitte bringen Sie mit:\n" + leistung.unterlagen.map((u) => `- ${tx(u, "de")}`).join("\n") : "",
      "",
      `Buchungsnummer: ${ergebnis.id}`,
      "Wenn Sie den Termin nicht wahrnehmen können, sagen Sie ihn bitte unter „Meine Anliegen“ ab.",
      "",
      "Freundliche Grüße",
      tenant.email.absenderName,
    ]
      .filter((z, i, arr) => z !== "" || arr[i - 1] !== "")
      .join("\n"),
    attachments: [
      {
        filename: "termin.ics",
        contentType: "text/calendar; charset=utf-8",
        content: ics({ uid: `${ergebnis.id}@${tenant.slug}`, start, minuten: slotMinuten, titel, ort, beschreibung: `Buchungsnummer ${ergebnis.id}` }),
      },
    ],
  }).catch((e) => console.error("[mail] Versand fehlgeschlagen:", (e as Error).message));

  return { id: ergebnis.id, zugangscode: ergebnis.code, slot: b.slot, amt: tx(amt.name, "de"), ort, videoLink };
}

/** Termin absagen – mit Zugangscode oder als angemeldeter Kontoinhaber. */
export async function storniere(tenant: GemeindeConfig, id: string, code?: string, kontoId?: string): Promise<boolean> {
  const t = await store().get<TerminRecord>("termine", id);
  if (!t || t.tenant !== tenant.slug) return false;
  const berechtigt = code ? safeEqualHex(t.tokenHash, hashToken(code)) : !!kontoId && t.kontoId === kontoId;
  if (!berechtigt) return false;
  await store().put("termine", { ...t, status: "storniert" });
  const { email, name } = decryptJson<{ email: string; name: string }>(t.daten);
  await sendMail(tenant, {
    to: email,
    subject: `Termin abgesagt (${id})`,
    text: `Guten Tag ${name},\n\nIhr Termin ${id} wurde abgesagt.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
  }).catch(() => undefined);
  return true;
}
