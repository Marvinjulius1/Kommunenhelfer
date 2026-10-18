/**
 * GET  /api/zahlung/[id]?t=…         – Zahlung anzeigen
 * POST /api/zahlung/[id]  {methode}  – bezahlen (Testmodus) bzw. zum Anbieter weiterleiten
 * Zugriff: Kontoinhaber oder signierter Zugangslink (t).
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { demoModus } from "@/lib/demo";
import { kontoFuer } from "@/lib/konto/vertretung";
import { zahlungsAnbieter } from "@/lib/zahlung/anbieter";
import { ladeZahlung, markiereBezahlt, pruefeZahlungZugang } from "@/lib/zahlung/service";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

async function berechtigt(req: Request, id: string) {
  const tenant = await tenantAus(req);
  const z = await ladeZahlung(tenant, id);
  if (!z) return null;
  const konto = await kontoFuer(tenant, "zahlungen");
  const ok = (konto && z.kontoId === konto.id) || pruefeZahlungZugang(new URL(req.url).searchParams.get("t"), z.id);
  return ok ? { tenant, z } : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await berechtigt(req, (await params).id);
  if (!ctx) return fehler("nicht_gefunden", 404);
  const { z } = ctx;
  return Response.json({ id: z.id, betragCent: z.betragCent, zweck: z.zweck, status: z.status, methode: z.methode, bezahltAm: z.bezahltAm, referenz: z.referenz }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const ctx = await berechtigt(req, (await params).id);
  if (!ctx) return fehler("nicht_gefunden", 404);
  const b = z.object({ methode: z.enum(["karte", "paypal", "wallet", "wero", "lastschrift"]) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  if (ctx.z.status === "bezahlt") return Response.json({ ok: true, status: "bezahlt" });
  const anbieter = zahlungsAnbieter();
  if (!anbieter) return fehler("zahlung_nicht_eingerichtet", 501);
  if (anbieter.id === "demo" && demoModus()) {
    // Testmodus: Zahlung wird sofort als bezahlt gebucht – es fließt kein Geld.
    await markiereBezahlt(ctx.z, b.data.methode, `TEST-${randomBytes(4).toString("hex").toUpperCase()}`);
    return Response.json({ ok: true, status: "bezahlt" });
  }
  return fehler("weiterleitung_noetig", 409);
}
