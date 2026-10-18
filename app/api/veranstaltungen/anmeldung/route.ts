/** POST – Anmeldung zu einer Veranstaltung (auch ohne Konto). Ist sie voll, kommt man auf die Warteliste. */
import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { melde, veranstaltung } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

const Schema = z.object({
  veranstaltungId: z.string().max(80),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  telefon: z.string().trim().max(40).optional(),
  hinweis: z.string().trim().max(500).optional(),
  anzahl: z.number().int().min(1).max(6),
  einwilligung: z.literal(true),
});

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`anmeldung:${clientKey(req)}`, 10, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "veranstaltungen")) return fehler("nicht_verfuegbar", 404);
  const p = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const v = await veranstaltung(tenant, p.data.veranstaltungId);
  if (!v || !v.anmeldung || v.beginn < new Date().toISOString().slice(0, 16)) return fehler("nicht_moeglich", 409);
  const konto = await aktuellesKonto(tenant);
  const { name, email, telefon, hinweis, anzahl } = p.data;
  const r = await melde(tenant, v, { name, email, telefon, hinweis }, anzahl, basisUrl(req, tenant), konto?.id);
  return Response.json(r, { status: 201 });
}
