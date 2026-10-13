/**
 * POST /api/anliegen
 * Statusabfrage für "Meine Anliegen". Der Browser kennt Vorgangsnummer und
 * Zugangscode (lokal gespeichert); der Server speichert nur den Hash des Codes.
 * Es werden keine personenbezogenen Daten zurückgegeben.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { hashToken, safeEqualHex } from "@/lib/crypto";
import type { AntragRecord, TerminRecord } from "@/lib/records";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { store } from "@/lib/storage/store";

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
  const s = store();
  // Lazy Löschkonzept: abgelaufene Datensätze bei Gelegenheit entfernen.
  void s.purgeExpired("antraege").catch(() => undefined);
  void s.purgeExpired("termine").catch(() => undefined);

  const ergebnisse = await Promise.all(
    body.eintraege.map(async ({ id, code }) => {
      const h = hashToken(code);
      const a = await s.get<AntragRecord>("antraege", id);
      if (a && a.tenant === tenant.slug && safeEqualHex(a.tokenHash, h)) {
        return { id, typ: "antrag" as const, leistungId: a.leistungId, status: a.status, verlauf: a.verlauf, erstelltAm: a.erstelltAm };
      }
      const t = await s.get<TerminRecord>("termine", id);
      if (t && t.tenant === tenant.slug && safeEqualHex(t.tokenHash, h)) {
        return { id, typ: "termin" as const, leistungId: t.leistungId, amtId: t.amtId, slot: t.slot, status: t.status, erstelltAm: t.erstelltAm };
      }
      return { id, typ: "unbekannt" as const };
    }),
  );
  return Response.json({ eintraege: ergebnisse }, { headers: { "Cache-Control": "no-store" } });
}
