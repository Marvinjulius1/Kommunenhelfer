import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { speichereKonto } from "@/lib/konto/service";
import { synchronisiereKonto } from "@/lib/push/service";

export const runtime = "nodejs";

const Schema = z.object({
  emailBenachrichtigung: z.boolean().optional(),
  pushBenachrichtigung: z.boolean().optional(),
  abfallBezirk: z.string().max(60).nullable().optional(),
  ortsteil: z.string().max(60).nullable().optional(),
  abfallErinnerung: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const { abfallBezirk, ortsteil, ...rest } = b.data;
  if (abfallBezirk && !tenant.abfall?.bezirke.some((x) => x.id === abfallBezirk)) return fehler("ungueltige_anfrage");
  if (ortsteil && !tenant.ortsteile?.includes(ortsteil)) return fehler("ungueltige_anfrage");
  const einstellungen = { ...ctx.konto.einstellungen, ...rest };
  // null = Auswahl entfernen
  if (abfallBezirk !== undefined) einstellungen.abfallBezirk = abfallBezirk ?? undefined;
  if (ortsteil !== undefined) einstellungen.ortsteil = ortsteil ?? undefined;
  if (!einstellungen.abfallBezirk) einstellungen.abfallErinnerung = false;
  const neu = { ...ctx.konto, einstellungen };
  await speichereKonto(neu);
  await synchronisiereKonto(neu);
  return Response.json(einstellungen);
}
