/**
 * Mandanten-Register (Multi-Tenant).
 *
 * Jede Gemeinde wird hier EINMAL eingetragen. Der Schlüssel entspricht
 * dem Ordnernamen unter tenants/ und der Subdomain
 * (z. B. musterstadt.meinportal.de → "musterstadt").
 */
import type { GemeindeConfig } from "@/config/types";
import musterstadt from "./musterstadt/gemeinde.config";
import beispielhausen from "./beispielhausen/gemeinde.config";

export const tenants: Record<string, GemeindeConfig> = {
  musterstadt,
  beispielhausen,
};

/** Gemeinde, die verwendet wird, wenn keine Subdomain erkannt wird. */
export const DEFAULT_TENANT = process.env.TENANT || process.env.NEXT_PUBLIC_DEFAULT_TENANT || "musterstadt";
