/**
 * GET /api/termine/slots?amt=<amtId>
 * Liefert freie Termine. Enthält keine personenbezogenen Daten.
 */
import { tenantAus } from "@/lib/api";
import { belegung } from "@/lib/booking/service";
import { berechneSlots } from "@/lib/booking/slots";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`slots:${clientKey(req)}`, 60, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const tenant = tenantAus(req);
  const amtId = new URL(req.url).searchParams.get("amt");
  const amt = tenant.aemter.find((a) => a.id === amtId);
  if (!amt) return Response.json({ fehler: "amt_unbekannt" }, { status: 404 });

  const slots = berechneSlots(tenant, amt, await belegung(tenant.slug, amt.id));
  return Response.json({ slots, slotMinuten: amt.slotMinuten }, { headers: { "Cache-Control": "no-store" } });
}
