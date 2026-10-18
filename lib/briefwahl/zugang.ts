/** Wer darf Briefwahl im Backoffice bearbeiten? Wer für das Amt der Briefwahl zuständig ist. */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { darfAmt, type BoBenutzer } from "@/lib/backoffice/auth";
import { briefwahlLeistung } from "./wahlen";

export const wahlAmtId = (tenant: GemeindeConfig) => briefwahlLeistung(tenant, []).amtId ?? tenant.uploads.standardAmtId;
export const darfWahlamt = (tenant: GemeindeConfig, b: BoBenutzer) => darfAmt(b, wahlAmtId(tenant));
