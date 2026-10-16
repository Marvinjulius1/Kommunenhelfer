"use client";

/**
 * Stellt Gemeinde-Konfiguration, Sprache, Oberflächentexte und das
 * angemeldete Bürgerkonto (Kurzinfo, ohne IBAN) im Browser bereit.
 */
import { createContext, useContext } from "react";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { dict, type Dict } from "@/lib/i18n";
import type { KontoSicht } from "@/lib/konto/types";

interface Ctx {
  tenant: GemeindeConfig;
  lang: Sprache;
  t: Dict;
  konto: KontoSicht | null;
}

const TenantContext = createContext<Ctx | null>(null);

export function TenantProvider({ tenant, lang, konto, children }: { tenant: GemeindeConfig; lang: Sprache; konto: KontoSicht | null; children: React.ReactNode }) {
  return <TenantContext.Provider value={{ tenant, lang, t: dict(lang), konto }}>{children}</TenantContext.Provider>;
}

export function useTenant(): Ctx {
  const c = useContext(TenantContext);
  if (!c) throw new Error("useTenant außerhalb von TenantProvider");
  return c;
}
