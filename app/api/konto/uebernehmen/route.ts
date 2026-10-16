/** Auf diesem Gerät gespeicherte Anliegen (Nummer + Code) in das Konto übernehmen. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { hashToken, safeEqualHex } from "@/lib/crypto";
import { mitKonto } from "@/lib/konto/api";
import type { TerminRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";
import { ladeMitCode } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ eintraege: z.array(z.object({ id: z.string().max(40), code: z.string().max(64) })).max(50) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  let n = 0;
  for (const { id, code } of b.data.eintraege) {
    const v = await ladeMitCode(tenant, id, code);
    if (v && !v.kontoId) {
      await store().put("vorgaenge", { ...v, kontoId: ctx.konto.id });
      n++;
      continue;
    }
    const t = await store().get<TerminRecord>("termine", id);
    if (t && t.tenant === tenant.slug && !t.kontoId && safeEqualHex(t.tokenHash, hashToken(code))) {
      await store().put("termine", { ...t, kontoId: ctx.konto.id });
      n++;
    }
  }
  return Response.json({ uebernommen: n });
}
