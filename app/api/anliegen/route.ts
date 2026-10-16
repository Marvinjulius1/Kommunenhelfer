/**
 * POST /api/anliegen
 * Statusabfrage für "Meine Anliegen". Der Browser kennt Vorgangsnummer und
 * Zugangscode (lokal gespeichert); der Server speichert nur den Hash des Codes.
 * Zurückgegeben werden nur Daten, die der Bürger selbst kennt.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { hashToken, safeEqualHex } from "@/lib/crypto";
import type { TerminRecord } from "@/lib/records";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { store } from "@/lib/storage/store";
import { bereinigeGelegentlich, ladeMitCode } from "@/lib/vorgaenge/service";
import { terminSicht, vorgangExtras, vorgangSicht } from "@/lib/vorgaenge/sicht";

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
  const tenant = await tenantAus(req);
  bereinigeGelegentlich();

  const ergebnisse = await Promise.all(
    body.eintraege.map(async ({ id, code }) => {
      const v = await ladeMitCode(tenant, id, code);
      if (v) return { ...vorgangSicht(tenant, v), ...(await vorgangExtras(tenant, v, { code })) };
      const t = await store().get<TerminRecord>("termine", id);
      if (t && t.tenant === tenant.slug && safeEqualHex(t.tokenHash, hashToken(code))) return terminSicht(tenant, t);
      return { id, typ: "unbekannt" as const };
    }),
  );
  return Response.json({ eintraege: ergebnisse }, { headers: { "Cache-Control": "no-store" } });
}
