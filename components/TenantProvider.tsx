"use client";

/**
 * Stellt Gemeinde-Konfiguration, Sprache und Oberflächentexte im Browser bereit.
 * Die Konfiguration enthält ausschließlich öffentliche Informationen.
 */
import { createContext, useContext } from "react";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { dict, type Dict } from "@/lib/i18n";

interface Ctx {
  tenant: GemeindeConfig;
  lang: Sprache;
  t: Dict;
}

const TenantContext = createContext<Ctx | null>(null);

export function TenantProvider({ tenant, lang, children }: { tenant: GemeindeConfig; lang: Sprache; children: React.ReactNode }) {
  return <TenantContext.Provider value={{ tenant, lang, t: dict(lang) }}>{children}</TenantContext.Provider>;
}

export function useTenant(): Ctx {
  const c = useContext(TenantContext);
  if (!c) throw new Error("useTenant außerhalb von TenantProvider");
  return c;
}
