import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { speichereKonto } from "@/lib/konto/service";

export const runtime = "nodejs";

const Schema = z.object({
  emailBenachrichtigung: z.boolean().optional(),
  pushBenachrichtigung: z.boolean().optional(),
  abfallBezirk: z.string().max(60).optional(),
  ortsteil: z.string().max(60).optional(),
  abfallErinnerung: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const einstellungen = { ...ctx.konto.einstellungen, ...b.data };
  await speichereKonto({ ...ctx.konto, einstellungen });
  return Response.json(einstellungen);
}
