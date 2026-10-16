/** Was Bürger über ihre Vorgänge und Termine sehen (keine internen Daten). */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { tx } from "@/lib/i18n";
import type { TerminRecord, VorgangRecord } from "@/lib/records";
import { nachrichten } from "./service";

export function vorgangSicht(tenant: GemeindeConfig, v: VorgangRecord) {
  const amt = tenant.aemter.find((a) => a.id === v.amtId);
  const l = tenant.leistungen.find((x) => x.id === v.leistungId);
  return {
    id: v.id,
    typ: "vorgang" as const,
    titel: l ? tx(l.titel, "de") : v.quelle === "mangel" ? `Mängelmeldung: ${v.mangel?.kategorie ?? ""}` : "Eingereichte Unterlagen",
    leistungId: v.leistungId,
    amt: amt ? tx(amt.name, "de") : undefined,
    status: v.status,
    verlauf: v.verlauf.map(({ status, am }) => ({ status, am })),
    dokumente: v.dokumente.length,
    nachrichten: nachrichten(v).map(({ von, text, am }) => ({ von, text, am })),
    erstelltAm: v.erstelltAm,
  };
}

export function terminSicht(tenant: GemeindeConfig, t: TerminRecord) {
  const amt = tenant.aemter.find((a) => a.id === t.amtId);
  const l = tenant.leistungen.find((x) => x.id === t.leistungId);
  return {
    id: t.id,
    typ: "termin" as const,
    titel: `${amt ? tx(amt.name, "de") : "Termin"}${l ? ` – ${tx(l.titel, "de")}` : ""}`,
    leistungId: t.leistungId,
    amtId: t.amtId,
    slot: t.slot,
    videoLink: t.videoLink,
    status: t.status,
    erstelltAm: t.erstelltAm,
  };
}
