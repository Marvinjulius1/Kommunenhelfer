/**
 * Vorgänge: Online-Anträge und eingereichte Unterlagen in EINEM Modell.
 * Der Assistent sortiert nur vor – Status und Entscheidung setzt das Amt.
 */
import "server-only";
import type { GemeindeConfig, Leistung } from "@/config/types";
import { decryptJson, encryptJson, hashToken, safeEqualHex, vorgangsnummer, zugangscode } from "@/lib/crypto";
import { tx } from "@/lib/i18n";
import { sendMail } from "@/lib/mail";
import { entferneKontoDaten } from "@/lib/konto/service";
import type { DokumentMeta, KontoRecord, Nachricht, PostfachRecord, SafeRecord, UploadRecord, VorgangDaten, VorgangRecord, VorgangStatus } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { inTagen, store } from "@/lib/storage/store";
import { zaehle } from "@/lib/statistik";
import { leiteWeiter } from "./weiterleitung";

export const STATUS_LABEL: Record<VorgangStatus, string> = {
  eingegangen: "Eingegangen",
  in_bearbeitung: "In Bearbeitung",
  rueckfrage: "Rückfrage",
  erledigt: "Erledigt",
};

export interface NeuerVorgang {
  tenant: GemeindeConfig;
  quelle: VorgangRecord["quelle"];
  leistung?: Leistung;
  amtId: string;
  daten: VorgangDaten;
  dokumente?: DokumentMeta[];
  aufbewahrungTage: number;
  /** Basis-URL für Links (Backoffice) in Benachrichtigungen */
  basisUrl: string;
  /** Bürgerkonto (falls angemeldet) */
  kontoId?: string;
  terminId?: string;
  mangel?: VorgangRecord["mangel"];
}

export async function erstelleVorgang(v: NeuerVorgang): Promise<{ vorgangsnummer: string; zugangscode: string }> {
  const id = vorgangsnummer(v.tenant.slug);
  const code = zugangscode();
  const jetzt = new Date().toISOString();
  const record: VorgangRecord = {
    id,
    tenant: v.tenant.slug,
    quelle: v.quelle,
    kontoId: v.kontoId,
    terminId: v.terminId,
    mangel: v.mangel,
    leistungId: v.leistung?.id,
    leistungsschluessel: v.leistung?.leistungsschluessel,
    amtId: v.amtId,
    status: "eingegangen",
    verlauf: [{ status: "eingegangen", am: jetzt }],
    tokenHash: hashToken(code),
    daten: encryptJson(v.daten),
    dokumente: v.dokumente ?? [],
    nachrichten: encryptJson([] satisfies Nachricht[]),
    einwilligungAm: jetzt,
    erstelltAm: jetzt,
    loeschenAm: inTagen(v.aufbewahrungTage),
  };
  await store().put("vorgaenge", record);
  await zaehle(v.tenant.slug, "vorgaenge", 1, v.leistung?.id);

  // Weiterleitung an das Amt – Fehler blockieren den Eingang nicht (Vorgang liegt im Backoffice).
  const amt = v.tenant.aemter.find((a) => a.id === v.amtId)!;
  const ok = await leiteWeiter(v.tenant, amt, record, v.basisUrl).catch((e) => {
    console.error("[weiterleitung] fehlgeschlagen:", (e as Error).message);
    return false;
  });
  await store().put("vorgaenge", { ...record, weiterleitung: { typ: amt.weiterleitung?.typ ?? "backoffice", ok, am: new Date().toISOString() } });

  // Eingangsbestätigung an den Bürger
  if (!v.daten.kontakt.email) return { vorgangsnummer: id, zugangscode: code };
  const titel = v.leistung ? tx(v.leistung.titel, "de") : "Ihr Anliegen";
  await sendMail(v.tenant, {
    to: v.daten.kontakt.email,
    subject: `Eingangsbestätigung: ${titel} (${id})`,
    text: [
      `Guten Tag ${v.daten.kontakt.name},`,
      "",
      `vielen Dank. Ihr Anliegen „${titel}“ ist bei der ${v.tenant.art} ${v.tenant.name} eingegangen und wurde an folgende Stelle weitergeleitet: ${tx(amt.name, "de")}.`,
      v.dokumente?.length ? `Eingereichte Unterlagen: ${v.dokumente.length}` : "",
      "",
      `Vorgangsnummer: ${id}`,
      amt.bearbeitungshinweis ? tx(amt.bearbeitungshinweis, "de") : "",
      "",
      v.kontoId
        ? "Den aktuellen Stand sehen Sie in Ihrem Bürgerkonto unter „Meine Anliegen“."
        : "Den aktuellen Stand sehen Sie unter „Meine Anliegen“ auf dem Gerät, mit dem Sie das Anliegen gesendet haben.",
      "Über Ihr Anliegen entscheidet die zuständige Stelle. Der digitale Assistent hat Ihre Unterlagen lediglich vorsortiert.",
      "",
      "Freundliche Grüße",
      v.tenant.email.absenderName,
    ]
      .filter((z, i, a) => z !== "" || a[i - 1] !== "")
      .join("\n"),
  }).catch((e) => console.error("[mail] Versand fehlgeschlagen:", (e as Error).message));

  return { vorgangsnummer: id, zugangscode: code };
}

/** Übernimmt zwischengespeicherte Uploads in einen Vorgang. */
export function uploadsZuDokumenten(uploads: UploadRecord[], arten: Record<string, string>): DokumentMeta[] {
  return uploads.map((u) => ({ id: u.id, art: arten[u.id] ?? u.art, typ: u.typ, groesse: u.groesse, seiten: u.seiten, name: u.name }));
}

export async function ladeVorgang(tenant: GemeindeConfig, id: string): Promise<VorgangRecord | undefined> {
  const v = await store().get<VorgangRecord>("vorgaenge", id);
  return v && v.tenant === tenant.slug ? v : undefined;
}

export async function ladeMitCode(tenant: GemeindeConfig, id: string, code: string) {
  const v = await ladeVorgang(tenant, id);
  return v && safeEqualHex(v.tokenHash, hashToken(code)) ? v : undefined;
}

export function nachrichten(v: VorgangRecord): Nachricht[] {
  return decryptJson<Nachricht[]>(v.nachrichten);
}

export async function setzeStatus(v: VorgangRecord, status: VorgangStatus, benutzer?: string) {
  const neu: VorgangRecord = { ...v, status, verlauf: [...v.verlauf, { status, am: new Date().toISOString(), benutzer }] };
  await store().put("vorgaenge", neu);
  return neu;
}

export async function fuegeNachrichtHinzu(tenant: GemeindeConfig, v: VorgangRecord, n: Omit<Nachricht, "am">) {
  const liste = [...nachrichten(v), { ...n, am: new Date().toISOString() }];
  let neu: VorgangRecord = { ...v, nachrichten: encryptJson(liste) };
  if (n.von === "amt") {
    neu = { ...neu, status: "rueckfrage", verlauf: [...v.verlauf, { status: "rueckfrage", am: new Date().toISOString(), benutzer: n.benutzer }] };
    const d = decryptJson<VorgangDaten>(v.daten);
    await sendMail(tenant, {
      to: d.kontakt.email,
      subject: `Rückfrage zu Ihrem Anliegen ${v.id}`,
      text: `Guten Tag ${d.kontakt.name},\n\nzu Ihrem Anliegen ${v.id} haben wir eine Rückfrage:\n\n${n.text}\n\nBitte antworten Sie unter „Meine Anliegen“ im Bürgerservice-Portal.\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
    }).catch((e) => console.error("[mail] Versand fehlgeschlagen:", (e as Error).message));
  }
  await store().put("vorgaenge", neu);
  return neu;
}

/**
 * Löschkonzept: entfernt abgelaufene Vorgänge, Zwischen-Uploads, Termine
 * und Audit-Einträge – inklusive der verschlüsselten Dateien.
 */
export async function loescheAbgelaufene(): Promise<number> {
  const s = store();
  const vorgaenge = await s.purgeExpired<VorgangRecord>("vorgaenge");
  const uploads = await s.purgeExpired<UploadRecord>("uploads");
  await Promise.all([...vorgaenge.flatMap((v) => v.dokumente.map((d) => d.id)), ...uploads.map((u) => u.id)].map((id) => blobs.delete(id)));
  const termine = await s.purgeExpired("termine");
  const audit = await s.purgeExpired("audit");
  // Bürgerkonto und Zusatzdienste
  const post = await s.purgeExpired<PostfachRecord>("postfach");
  const safe = await s.purgeExpired<SafeRecord>("safe");
  await Promise.all([...post.flatMap((p) => (p.dokument ? [p.dokument.id] : [])), ...safe.map((x) => x.id)].map((id) => blobs.delete(id)));
  let weitere = 0;
  for (const c of ["zahlungen", "push", "sitzungen", "checklisten", "meldungen", "cronlaeufe"]) weitere += (await s.purgeExpired(c)).length;
  // Konten nach Inaktivität: mit allen zugehörigen Daten entfernen
  const konten = await s.purgeExpired<KontoRecord>("konten");
  for (const k of konten) await entferneKontoDaten(k);
  return vorgaenge.length + uploads.length + termine.length + audit.length + post.length + safe.length + weitere + konten.length;
}

let letzteBereinigung = 0;
/** Höchstens alle 10 Minuten im Hintergrund aufräumen. */
export function bereinigeGelegentlich() {
  if (Date.now() - letzteBereinigung < 10 * 60_000) return;
  letzteBereinigung = Date.now();
  void loescheAbgelaufene().catch((e) => console.error("[loeschung]", (e as Error).message));
}
