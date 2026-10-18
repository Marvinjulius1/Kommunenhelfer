/**
 * Zufriedenheit mit einem Klick (1–5). Keine Verknüpfung zu Person oder Vorgang:
 * gespeichert werden Note, Anlass, Leistung/Amt und – freiwillig – ein Freitext
 * (verschlüsselt, nach einem Jahr gelöscht). Für den Bericht zusätzlich Tagessummen.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson, encryptJson } from "@/lib/crypto";
import type { FeedbackRecord } from "@/lib/records";
import { zaehle } from "@/lib/statistik";
import { inTagen, store } from "@/lib/storage/store";

export async function speichereFeedback(tenant: GemeindeConfig, f: { note: FeedbackRecord["note"]; anlass: FeedbackRecord["anlass"]; leistungId?: string; amtId?: string; text?: string }) {
  const r: FeedbackRecord = {
    id: randomBytes(10).toString("base64url"),
    tenant: tenant.slug,
    note: f.note,
    anlass: f.anlass,
    leistungId: f.leistungId,
    amtId: f.amtId,
    text: f.text ? encryptJson(f.text) : undefined,
    erstelltAm: new Date().toISOString(),
    loeschenAm: inTagen(365),
  };
  await store().put("feedback", r);
  await zaehle(tenant.slug, "bewertungen", 1);
  await zaehle(tenant.slug, "bewertung_summe", f.note);
  return r;
}

/** Freitext nachreichen (nur innerhalb von 30 Minuten nach der Bewertung, mit dem Schlüssel aus der Antwort). */
export async function ergaenzeText(tenant: GemeindeConfig, id: string, text: string) {
  const r = await store().get<FeedbackRecord>("feedback", id);
  if (!r || r.tenant !== tenant.slug || r.text || Date.now() - Date.parse(r.erstelltAm) > 30 * 60_000) return false;
  await store().put("feedback", { ...r, text: encryptJson(text) });
  return true;
}

export async function feedbackSeit(tenant: GemeindeConfig, ab: string) {
  return (await store().list<FeedbackRecord>("feedback", (f) => f.tenant === tenant.slug && f.erstelltAm >= ab)).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
}

export function feedbackText(f: FeedbackRecord) {
  return f.text ? decryptJson<string>(f.text) : undefined;
}
