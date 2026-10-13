/**
 * POST /api/anliegen
 * Statusabfrage für "Meine Anliegen". Der Browser kennt Vorgangsnummer und
 * Zugangscode (lokal gespeichert); der Server speichert nur den Hash des Codes.
 * Zurückgegeben werden nur Daten, die der Bürger selbst kennt.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { hashToken, safeEqualHex } from "@/lib/crypto";
import { tx } from "@/lib/i18n";
import type { TerminRecord } from "@/lib/records";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { store } from "@/lib/storage/store";
import { bereinigeGelegentlich, ladeMitCode, nachrichten } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Schema = z.object({
  eintraege: z.array(z.object({ id: z.string().max(40), code: z.string().max(64) })).max(50),
});

export async function POST(req: Request) {
  const rl = rateLimit(`anliegen:${clientKey(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const tenant = tenantAus(req);
  bereinigeGelegentlich();

  const ergebnisse = await Promise.all(
    body.eintraege.map(async ({ id, code }) => {
      const v = await ladeMitCode(tenant, id, code);
      if (v) {
        const amt = tenant.aemter.find((a) => a.id === v.amtId);
        return {
          id,
          typ: "vorgang" as const,
          leistungId: v.leistungId,
          amt: amt ? tx(amt.name, "de") : undefined,
          status: v.status,
          verlauf: v.verlauf.map(({ status, am }) => ({ status, am })),
          dokumente: v.dokumente.length,
          nachrichten: nachrichten(v).map(({ von, text, am }) => ({ von, text, am })),
          erstelltAm: v.erstelltAm,
        };
      }
      const t = await store().get<TerminRecord>("termine", id);
      if (t && t.tenant === tenant.slug && safeEqualHex(t.tokenHash, hashToken(code))) {
        return { id, typ: "termin" as const, leistungId: t.leistungId, amtId: t.amtId, slot: t.slot, status: t.status, erstelltAm: t.erstelltAm };
      }
      return { id, typ: "unbekannt" as const };
    }),
  );
  return Response.json({ eintraege: ergebnisse }, { headers: { "Cache-Control": "no-store" } });
}
