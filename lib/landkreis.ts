/**
 * Landkreis-Version: Ein Kreis betreibt ein Portal für sich und verweist auf die
 * Portale seiner Gemeinden; Gemeinden finden Leistungen des Kreises (Kfz,
 * Führerschein, Bauantrag, Wohngeld …) und verlinken dorthin.
 */
import "server-only";
import type { GemeindeConfig, Leistung } from "@/config/types";
import { tx } from "@/lib/i18n";
import { normalisiere, tokens } from "@/lib/assistant/text";
import { basisTenant, mitAnpassungen } from "@/lib/tenant";

/** Adresse eines anderen Mandanten: eigene Subdomain (PORTAL_URL mit {gemeinde}) oder Vorschau-Link */
export function portalAdresse(slug: string, pfad = "/") {
  const p = process.env.PORTAL_URL;
  if (p?.includes("{gemeinde}")) return p.replace("{gemeinde}", slug).replace(/\/$/, "") + pfad;
  return `${pfad}${pfad.includes("?") ? "&" : "?"}gemeinde=${slug}`;
}

export async function kreisVon(tenant: GemeindeConfig): Promise<GemeindeConfig | undefined> {
  if (!tenant.landkreis) return undefined;
  const k = await basisTenant(tenant.landkreis.slug);
  return k.slug === tenant.landkreis.slug ? mitAnpassungen(k) : undefined;
}

export function kreisLink(tenant: GemeindeConfig, leistung?: Leistung) {
  const lk = tenant.landkreis!;
  const pfad = leistung ? (leistung.online && leistung.formular ? `/antrag/${leistung.id}` : leistung.termin ? `/termine?leistung=${leistung.id}` : "/") : "/";
  return lk.url && !leistung ? lk.url : portalAdresse(lk.slug, pfad);
}

/** Wie gut passt eine Leistung zur Frage? Stichworte (Wortgruppen zählen mehr) und Titelwörter. */
export function punkteFuer(l: Leistung, frage: string): number {
  const text = ` ${normalisiere(frage)} `;
  const worte = new Set(tokens(frage));
  let punkte = 0;
  for (const s of l.stichworte) {
    const n = normalisiere(s);
    if (n.includes(" ") ? text.includes(` ${n} `) : worte.has(n)) punkte += n.includes(" ") ? 3 : 2;
  }
  for (const w of tokens(tx(l.titel, "de"))) if (w.length > 3 && worte.has(w)) punkte += 1;
  return punkte;
}

/** Beste Kreis-Leistung zu einer Frage (Stichworte und Titel) – oder keine. */
export function kreisLeistung(kreis: GemeindeConfig, frage: string): { l: Leistung; punkte: number } | undefined {
  let beste: { l: Leistung; punkte: number } | undefined;
  for (const l of kreis.leistungen.filter((x) => x.aktiv)) {
    const punkte = punkteFuer(l, frage);
    if (punkte >= 2 && (!beste || punkte > beste.punkte)) beste = { l, punkte };
  }
  return beste;
}

/** Gemeinde zu einer Postleitzahl oder einem Namen (Kreisportal: „Zu Ihrer Gemeinde“) */
export function findeGemeinde(kreis: GemeindeConfig, eingabe: string) {
  const e = normalisiere(eingabe);
  if (!e) return [];
  return (kreis.gemeinden ?? []).filter((g) => g.plz.some((p) => p.startsWith(e)) || normalisiere(g.name).includes(e));
}
