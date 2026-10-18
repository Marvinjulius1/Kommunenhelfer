/**
 * Warnungen: eigene Meldungen mit Warnstufe plus amtliche Warnungen des Bundes
 * (NINA/MoWaS, DWD, Hochwasser) für den Kreis der Gemeinde.
 * NINA wird serverseitig abgerufen und zwischengespeichert – Bürger-IPs gehen
 * nicht an Dritte. Fällt NINA aus, bleibt es bei den eigenen Warnungen.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { aktiv } from "@/lib/funktionen";
import { aktuelleMeldungen } from "@/lib/meldungen/service";

export interface Warnung {
  id: string;
  stufe: "warnung" | "gefahr";
  titel: string;
  text?: string;
  quelle: "gemeinde" | "nina";
  seit: string;
}

const NINA = process.env.NINA_API_URL || "https://warnung.bund.de/api31";
const CACHE_MS = 5 * 60_000;
const g = globalThis as { __ninaCache?: Map<string, { zeit: number; daten: Warnung[]; laeuft?: Promise<void> }> };
const cache = (g.__ninaCache ??= new Map());

/** NINA erwartet den Regionalschlüssel auf Kreisebene (letzte 7 Stellen 0). */
export function kreisArs(ars: string) {
  return ars.slice(0, 5) + "0000000";
}

export function stufeAus(severity?: string): Warnung["stufe"] | undefined {
  if (severity === "Extreme" || severity === "Severe") return "gefahr";
  if (severity === "Moderate") return "warnung";
  return undefined;
}

interface NinaEintrag {
  id: string;
  sent?: string;
  payload?: { data?: { headline?: string; severity?: string; msgType?: string } };
}

export function ausNina(liste: NinaEintrag[]): Warnung[] {
  return liste.flatMap((e) => {
    const d = e.payload?.data;
    const stufe = stufeAus(d?.severity);
    if (!stufe || !d?.headline || d.msgType === "Cancel") return [];
    return [{ id: `nina:${e.id}`, stufe, titel: d.headline, quelle: "nina" as const, seit: e.sent ?? new Date().toISOString() }];
  });
}

async function ladeNina(ars: string) {
  const r = await fetch(`${NINA}/dashboard/${kreisArs(ars)}.json`, { headers: { accept: "application/json", "user-agent": "Buergerportal (kommunal)" }, signal: AbortSignal.timeout(3000), cache: "no-store" });
  if (!r.ok) throw new Error(`NINA ${r.status}`);
  return ausNina((await r.json()) as NinaEintrag[]);
}

/** Liefert sofort den Zwischenspeicher und aktualisiert im Hintergrund (Seiten warten nie auf NINA). */
function ninaWarnungen(tenant: GemeindeConfig): Warnung[] {
  if (!tenant.ars) return [];
  const c = cache.get(tenant.ars) ?? { zeit: 0, daten: [] };
  if (Date.now() - c.zeit > CACHE_MS && !c.laeuft) {
    c.laeuft = ladeNina(tenant.ars)
      .then((d) => {
        c.daten = d;
      })
      .catch((e) => console.error("[nina]", (e as Error).message))
      .finally(() => {
        c.zeit = Date.now();
        c.laeuft = undefined;
      });
    cache.set(tenant.ars, c);
  }
  return c.daten;
}

export async function aktiveWarnungen(tenant: GemeindeConfig, ortsteil?: string): Promise<Warnung[]> {
  if (!aktiv(tenant, "warnungen")) return [];
  const eigene = (await aktuelleMeldungen(tenant, ortsteil))
    .filter((m) => m.stufe === "warnung" || m.stufe === "gefahr")
    .map((m) => ({ id: m.id, stufe: m.stufe as Warnung["stufe"], titel: m.titel, text: m.text.slice(0, 200), quelle: "gemeinde" as const, seit: m.erstelltAm }));
  return [...eigene, ...ninaWarnungen(tenant)].sort((a, b) => Number(b.stufe === "gefahr") - Number(a.stufe === "gefahr") || b.seit.localeCompare(a.seit));
}
