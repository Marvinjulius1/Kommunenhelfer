/**
 * POST /api/vorgang – Unterlagen verbindlich an das zuständige Amt senden.
 * Erst nach ausdrücklicher Bestätigung im Browser. Das Amt entscheidet.
 */
import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { dokumentarten } from "@/lib/uploads/dokumentarten";
import { zustaendigesAmt } from "@/lib/uploads/pruefung";
import { uebernehmeUploads, uploadsImEntwurf } from "@/lib/uploads/service";
import { erstelleVorgang, uploadsZuDokumenten } from "@/lib/vorgaenge/service";
import { findeLeistung } from "@/lib/tenant";
import { aktuellesKonto } from "@/lib/konto/service";

export const runtime = "nodejs";

const Schema = z.object({
  entwurf: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  dokumente: z.array(z.object({ id: z.string().max(64), art: z.string().max(60) })).min(1).max(30),
  leistungId: z.string().max(80).optional(),
  amtId: z.string().max(60).optional(),
  kontakt: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    telefon: z.string().trim().max(40).optional(),
  }),
  nachricht: z.string().trim().max(2000).optional(),
  bestaetigt: z.literal(true),
});

export async function POST(req: Request) {
  const rl = rateLimit(`vorgang:${clientKey(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const tenant = await tenantAus(req);
  const leistung = body.leistungId ? findeLeistung(tenant, body.leistungId) : undefined;
  if (body.leistungId && !leistung) return fehler("leistung_unbekannt");

  // Nur eigene, noch nicht abgesendete Uploads dieses Entwurfs
  const imEntwurf = await uploadsImEntwurf(tenant, body.entwurf);
  const uploads = body.dokumente.map((d) => imEntwurf.find((u) => u.id === d.id));
  if (uploads.some((u) => !u)) return fehler("dokument_unbekannt", 409);

  const erlaubteArten = new Set(dokumentarten(tenant).map((d) => d.id));
  const arten = Object.fromEntries(body.dokumente.map((d) => [d.id, erlaubteArten.has(d.art) ? d.art : "sonstiges"]));

  // Zuständigkeit: Bei bekannter Leistung entscheidet die Konfiguration, nicht der Browser.
  const amtWunsch = body.amtId && tenant.aemter.some((a) => a.id === body.amtId) ? body.amtId : undefined;
  const amt = zustaendigesAmt(tenant, leistung?.id, amtWunsch);

  const konto = await aktuellesKonto(tenant);
  const ergebnis = await erstelleVorgang({
    tenant,
    kontoId: konto?.id,
    quelle: "upload",
    leistung,
    amtId: amt.id,
    daten: { kontakt: body.kontakt, nachricht: body.nachricht },
    dokumente: uploadsZuDokumenten(uploads.map((u) => u!), arten),
    aufbewahrungTage: leistung?.aufbewahrungTage ?? tenant.uploads.aufbewahrungTage,
    basisUrl: basisUrl(req, tenant),
  });
  await uebernehmeUploads(uploads.map((u) => u!.id));

  return Response.json(
    { ...ergebnis, amt: tx(amt.name, "de"), bearbeitungshinweis: amt.bearbeitungshinweis ? tx(amt.bearbeitungshinweis, "de") : undefined },
    { status: 201 },
  );
}
