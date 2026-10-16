/** GET: Wartezeiten aller Ämter · POST { amtId }: Wartenummer ziehen */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { demoModus } from "@/lib/demo";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { geoeffnet, stand, wartendeAemter, zieheNummer } from "@/lib/wartezeit/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "warteschlange")) return fehler("nicht_verfuegbar", 404);
  const aemter = await Promise.all(wartendeAemter(tenant).map((a) => stand(tenant, a)));
  return Response.json({ aemter, stand: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "warteschlange")) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`warte:${clientKey(req)}`, 3, 30 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const b = z.object({ amtId: z.string().max(60) }).safeParse(await leseJson(req).catch(() => null));
  const amt = b.success ? wartendeAemter(tenant).find((a) => a.id === b.data.amtId) : undefined;
  if (!amt) return fehler("ungueltige_anfrage");
  // Außerhalb der Öffnungszeiten keine Nummern (in der Demo erlaubt, damit man es ausprobieren kann)
  if (!geoeffnet(tenant, amt) && !demoModus()) return fehler("geschlossen", 409);
  const konto = await aktuellesKonto(tenant);
  const { record, token } = await zieheNummer(tenant, amt, konto?.id);
  return Response.json({ id: record.id, token }, { status: 201 });
}
