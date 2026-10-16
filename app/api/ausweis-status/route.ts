/**
 * GET  ?nummer=…        – Status eines Ausweises (ohne Anmeldung, mit Rate-Limit)
 * POST { nummer }        – mit Bürgerkonto: benachrichtigen, sobald abholbereit
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { findeAusweis, merkeVor, normalisiereNummer, STATUS_TEXT } from "@/lib/ausweis/service";
import { aktiv } from "@/lib/funktionen";
import { mitKonto } from "@/lib/konto/api";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "ausweisStatus")) return fehler("nicht_verfuegbar", 404);
  // Raten verhindern: wenige Abfragen pro Stunde
  const rl = rateLimit(`ausweis:${clientKey(req)}`, 20, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const nummer = normalisiereNummer(new URL(req.url).searchParams.get("nummer") ?? "");
  if (!nummer) return fehler("ungueltige_nummer");
  const a = await findeAusweis(tenant, nummer);
  const status = a?.status ?? "unbekannt";
  return Response.json({ status, text: STATUS_TEXT[status], abholbereitAm: a?.abholbereitAm }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "ausweisStatus")) return fehler("nicht_verfuegbar", 404);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ nummer: z.string().max(40) }).safeParse(await leseJson(req).catch(() => null));
  const nummer = b.success ? normalisiereNummer(b.data.nummer) : undefined;
  if (!nummer) return fehler("ungueltige_nummer");
  const r = await merkeVor(tenant, nummer, ctx.konto.id);
  return Response.json({ status: r.status, text: STATUS_TEXT[r.status] });
}
