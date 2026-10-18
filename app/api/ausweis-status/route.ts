/**
 * GET  ?nummer=…        – Status eines Ausweises (ohne Anmeldung, mit Rate-Limit)
 * POST { nummer }        – mit Bürgerkonto: benachrichtigen, sobald abholbereit
 * POST { nummer, kanal, ziel } – ohne Konto: per SMS/WhatsApp/E-Mail benachrichtigen
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { findeAusweis, merkeKontakt, merkeVor, normalisiereNummer, STATUS_TEXT } from "@/lib/ausweis/service";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { kanalVerfuegbar, normalisiereTelefon } from "@/lib/kurznachricht";
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
  const roh = await leseJson(req).catch(() => null);
  const ohne = z.object({ nummer: z.string().max(40), kanal: z.enum(["sms", "whatsapp", "email"]), ziel: z.string().trim().max(200) }).safeParse(roh);
  if (ohne.success) {
    if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
    const rl = rateLimit(`ausweis-kontakt:${clientKey(req)}`, 5, 60 * 60_000);
    if (!rl.ok) return tooMany(rl.retryAfter);
    const nummer = normalisiereNummer(ohne.data.nummer);
    if (!nummer) return fehler("ungueltige_nummer");
    if (!kanalVerfuegbar(tenant, ohne.data.kanal)) return fehler("nicht_verfuegbar", 404);
    const ziel = ohne.data.kanal === "email" ? (z.string().email().safeParse(ohne.data.ziel).success ? ohne.data.ziel.toLowerCase() : undefined) : normalisiereTelefon(ohne.data.ziel);
    if (!ziel) return fehler(ohne.data.kanal === "email" ? "email" : "telefon");
    const r = await merkeKontakt(tenant, nummer, { kanal: ohne.data.kanal, ziel });
    return Response.json({ status: r.status, text: STATUS_TEXT[r.status] });
  }
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ nummer: z.string().max(40) }).safeParse(roh);
  const nummer = b.success ? normalisiereNummer(b.data.nummer) : undefined;
  if (!nummer) return fehler("ungueltige_nummer");
  const r = await merkeVor(tenant, nummer, ctx.konto.id);
  return Response.json({ status: r.status, text: STATUS_TEXT[r.status] });
}
