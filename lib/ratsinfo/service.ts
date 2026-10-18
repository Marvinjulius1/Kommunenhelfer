/**
 * Ratsinformationen: Sitzungen, Tagesordnungen und Beschlüsse.
 * Quelle ist die OParl-Schnittstelle des Ratsinformationssystems (Standard der
 * kommunalen Ratsinfo-Systeme). Fehlt sie oder ist sie nicht erreichbar, werden die
 * Sitzungen aus der Gemeinde-Config gezeigt.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";

export interface Tagesordnungspunkt {
  nummer?: string;
  titel: string;
  kurz?: string;
  beschluss?: string;
  oeffentlich: boolean;
}

export interface Sitzung {
  id: string;
  gremium: string;
  datum: string;
  ort: string;
  tagesordnung: Tagesordnungspunkt[];
  quelle: "oparl" | "config";
  link?: string;
  livestream?: string;
  aufzeichnung?: string;
}

/** Läuft die Sitzung gerade (Beginn bis 5 Stunden danach)? */
export function istLive(s: Pick<Sitzung, "datum" | "livestream">, jetzt = Date.now()) {
  const t = new Date(s.datum).getTime();
  return !!s.livestream && jetzt >= t - 15 * 60_000 && jetzt <= t + 5 * 3600_000;
}

const CACHE_MS = 10 * 60_000;
const g = globalThis as { __ratsinfoCache?: Map<string, { zeit: number; daten: Sitzung[] }> };
const cache = (g.__ratsinfoCache ??= new Map());

async function holeJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!r.ok) throw new Error(`OParl ${r.status}`);
  return r.json() as Promise<T>;
}

/** Nur https und keine internen Adressen – die URL kommt aus der Config. */
function erlaubt(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname);
  } catch {
    return false;
  }
}

interface OParlListe<T> {
  data: T[];
  links?: { next?: string };
}
interface OParlMeeting {
  id: string;
  name?: string;
  start?: string;
  cancelled?: boolean;
  location?: { description?: string } | string;
  organization?: string[];
  agendaItem?: { number?: string; name?: string; public?: boolean; resolutionText?: string }[];
  web?: string;
}

/** OParl 1.x: System → Körperschaft → Sitzungen (neueste zuerst, max. 3 Seiten). */
async function ausOParl(systemUrl: string): Promise<Sitzung[]> {
  const system = await holeJson<{ body: string }>(systemUrl);
  const bodies = await holeJson<OParlListe<{ meeting: string; name?: string }>>(system.body);
  const body = bodies.data[0];
  if (!body?.meeting || !erlaubt(body.meeting)) return [];
  const sitzungen: Sitzung[] = [];
  let url: string | undefined = body.meeting;
  for (let seite = 0; url && erlaubt(url) && seite < 3; seite++) {
    const liste: OParlListe<OParlMeeting> = await holeJson(url);
    for (const m of liste.data) {
      if (!m.start || m.cancelled) continue;
      sitzungen.push({
        id: Buffer.from(m.id).toString("base64url").slice(-24),
        gremium: m.name ?? "Sitzung",
        datum: m.start,
        ort: typeof m.location === "string" ? "" : (m.location?.description ?? ""),
        tagesordnung: (m.agendaItem ?? []).map((t) => ({ nummer: t.number, titel: t.name ?? "", beschluss: t.resolutionText, oeffentlich: t.public !== false })),
        quelle: "oparl",
        link: m.web && erlaubt(m.web) ? m.web : undefined,
      });
    }
    url = liste.links?.next;
  }
  return sitzungen;
}

function ausConfig(tenant: GemeindeConfig): Sitzung[] {
  return (tenant.ratsinfo?.sitzungen ?? []).map((s) => ({
    id: s.id,
    gremium: s.gremium,
    datum: s.datum,
    ort: s.ort,
    tagesordnung: s.tagesordnung.map((t, i) => ({ nummer: String(i + 1), titel: t.titel, kurz: t.kurz, beschluss: t.beschluss, oeffentlich: true })),
    quelle: "config",
    livestream: erlaubt(s.livestream) ? s.livestream : undefined,
    aufzeichnung: erlaubt(s.aufzeichnung) ? s.aufzeichnung : undefined,
  }));
}

export async function sitzungen(tenant: GemeindeConfig): Promise<Sitzung[]> {
  const c = cache.get(tenant.slug);
  if (c && Date.now() - c.zeit < CACHE_MS) return c.daten;
  let daten = ausConfig(tenant);
  const url = tenant.ratsinfo?.oparlUrl;
  if (erlaubt(url)) {
    try {
      const o = await ausOParl(url);
      if (o.length) daten = o;
    } catch (e) {
      console.error("[ratsinfo] OParl nicht erreichbar, nutze Config:", (e as Error).message);
    }
  }
  daten.sort((a, b) => b.datum.localeCompare(a.datum));
  cache.set(tenant.slug, { zeit: Date.now(), daten });
  return daten;
}

export async function sitzung(tenant: GemeindeConfig, id: string) {
  return (await sitzungen(tenant)).find((s) => s.id === id);
}
