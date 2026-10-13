/**
 * POST /api/antrag
 * Reicht ein geführtes Formular ein. Die Daten werden serverseitig mit
 * denselben Regeln wie im Browser geprüft und verschlüsselt gespeichert.
 */
import { z } from "zod";
import { basisUrl, fehler, langAus, leseJson, tenantAus } from "@/lib/api";
import { validiereFormular } from "@/lib/flows/validate";
import { gatewayFuer } from "@/lib/integrations";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { findeLeistung } from "@/lib/tenant";
import { tx } from "@/lib/i18n";

export const runtime = "nodejs";

const Schema = z.object({
  leistungId: z.string().max(80),
  werte: z.record(z.string(), z.string().max(2000)),
  einwilligungen: z.record(z.string(), z.literal(true)),
  lang: z.string().max(5).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`antrag:${clientKey(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req, 64_000));
  } catch {
    return fehler("ungueltige_anfrage");
  }

  const tenant = tenantAus(req);
  const lang = langAus(req, tenant, body.lang);
  const leistung = findeLeistung(tenant, body.leistungId);
  if (!leistung?.online || !leistung.formular) return fehler("leistung_nicht_online", 404);

  // Alle Pflicht-Bestätigungen + Datenschutz müssen vorliegen.
  const noetig = ["datenschutz", ...(leistung.formular.bestaetigungen ?? []).map((b) => b.id)];
  if (!noetig.every((id) => body.einwilligungen[id])) return fehler("einwilligung_fehlt");

  const pruefung = validiereFormular(leistung.formular, body.werte, lang);
  if (!pruefung.ok) return fehler("validierung", 422, { felder: pruefung.fehler });

  const ergebnis = await gatewayFuer(leistung).einreichen({ tenant, leistung, daten: pruefung.werte, basisUrl: basisUrl(req, tenant) });
  const titel = tx(leistung.titel, lang);
  return Response.json({ ...ergebnis, titel }, { status: 201 });
}
