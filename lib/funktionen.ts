/** Ist eine Portal-Funktion für diese Gemeinde aktiv? (gemeinsam für Server und Browser) */
import type { Funktionen, GemeindeConfig } from "@/config/types";

export const STANDARD_FUNKTIONEN: Funktionen = {
  konto: true,
  onlineAusweis: true,
  zahlung: true,
  maengelmelder: true,
  abfall: true,
  lebenslagen: true,
  beteiligung: true,
  ratsinfo: true,
  warteschlange: true,
  videoBeratung: true,
  fundbuero: true,
  ausweisStatus: true,
  push: true,
  vorlesen: true,
  spracheingabe: false,
};

export function aktiv(tenant: Pick<GemeindeConfig, "funktionen">, f: keyof Funktionen): boolean {
  return tenant.funktionen?.[f] ?? STANDARD_FUNKTIONEN[f];
}
