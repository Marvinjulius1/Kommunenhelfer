/** Was Bürger über ihre Vorgänge und Termine sehen (keine internen Daten). */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { tx } from "@/lib/i18n";
import type { TerminRecord, VorgangRecord } from "@/lib/records";
import { nachrichten } from "./service";
import { postFuerVorgang, postSicht } from "@/lib/postfach/service";
import { zahlungenVon, zahlungZugang } from "@/lib/zahlung/service";

/** Bescheide und Zahlungen zu einem Vorgang – für "Meine Anliegen". */
export async function vorgangExtras(tenant: GemeindeConfig, v: VorgangRecord, zugang?: { code: string }) {
  const post = (await postFuerVorgang(tenant.slug, v.id)).map((p) => {
    const s = postSicht(p);
    const q = zugang ? `?v=${encodeURIComponent(v.id)}&c=${encodeURIComponent(zugang.code)}` : "";
    return { id: s.id, art: s.art, titel: s.titel, text: s.text, erstelltAm: s.erstelltAm, gelesen: !!s.gelesenAm, datei: s.dokument ? `/api/postfach/${s.id}${q ? q + "&" : "?"}datei=1` : undefined, oeffnen: `/api/postfach/${s.id}${q}` };
  });
  const zahlungen = (await zahlungenVon((z) => z.tenant === tenant.slug && z.vorgangId === v.id)).map((z) => ({
    id: z.id,
    betragCent: z.betragCent,
    zweck: z.zweck,
    status: z.status,
    url: `/bezahlen/${z.id}?t=${encodeURIComponent(zahlungZugang(z))}`,
  }));
  return { post, zahlungen };
}

function mangelLabel(tenant: GemeindeConfig, id?: string) {
  const k = tenant.maengel?.kategorien.find((x) => x.id === id);
  return k ? tx(k.label, "de") : (id ?? "");
}

export function vorgangSicht(tenant: GemeindeConfig, v: VorgangRecord) {
  const amt = tenant.aemter.find((a) => a.id === v.amtId);
  const l = tenant.leistungen.find((x) => x.id === v.leistungId);
  return {
    id: v.id,
    typ: "vorgang" as const,
    titel: l ? tx(l.titel, "de") : v.quelle === "mangel" ? `Mängelmeldung: ${mangelLabel(tenant, v.mangel?.kategorie)}` : "Eingereichte Unterlagen",
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
