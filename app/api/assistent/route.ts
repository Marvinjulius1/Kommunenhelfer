/**
 * POST /api/assistent
 * Nimmt den Gesprächsverlauf entgegen und liefert eine strukturierte Antwort.
 * Der Verlauf wird NICHT gespeichert (Datensparsamkeit).
 */
import { z } from "zod";
import { beantworte } from "@/lib/assistant/engine";
import { fehler, langAus, leseJson, tenantAus } from "@/lib/api";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Schema = z.object({
  nachrichten: z
    .array(z.object({ rolle: z.enum(["buerger", "assistent"]), text: z.string().max(2000) }))
    .max(30),
  leistungId: z.string().max(80).regex(/^[a-z0-9-]+$/).optional(),
  kontextLeistungId: z.string().max(80).regex(/^[a-z0-9-]+$/).optional(),
  lang: z.string().max(5).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`assistent:${clientKey(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  if (!body.leistungId && !body.nachrichten.some((m) => m.rolle === "buerger" && m.text.trim())) {
    return fehler("leere_anfrage");
  }

  const tenant = tenantAus(req);
  const antwort = await beantworte(tenant, { ...body, lang: langAus(req, tenant, body.lang) });
  return Response.json(antwort, { headers: { "Cache-Control": "no-store" } });
}
