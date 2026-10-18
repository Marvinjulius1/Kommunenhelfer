/**
 * Kita-Platz-Börse (nur mit Bürgerkonto).
 * GET   – eigene Betreuungswünsche mit Platz auf der Warteliste
 * POST  { vorname, geburtsdatum, stunden, beginn, kitas[], hinweis? } – Bedarf melden
 * PATCH { id, aktion: "annehmen" | "ablehnen" | "zurueckziehen" }
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { aktiv } from "@/lib/funktionen";
import { alleWuensche, antworte, kindVon, ladeWunsch, MAX_WUENSCHE, meldeBedarf, rang, wuenscheVon, zieheZurueck } from "@/lib/kita/service";
import { mitKonto } from "@/lib/konto/api";

export const runtime = "nodejs";

async function kontext(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "kita") || !tenant.kitas?.length) return { antwort: fehler("nicht_verfuegbar", 404) };
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx;
  return { tenant, konto: ctx.konto };
}

export async function GET(req: Request) {
  const c = await kontext(req);
  if ("antwort" in c) return c.antwort;
  const alle = await alleWuensche(c.tenant);
  const eigene = await wuenscheVon(c.tenant, c.konto.id);
  return Response.json(
    {
      wuensche: eigene.map((w) => ({
        id: w.id,
        kind: kindVon(w),
        altersgruppe: w.altersgruppe,
        beginn: w.beginn,
        angebot: w.angebot,
        kitas: w.kitas.map((k) => ({ id: k, status: w.status[k], rang: rang(alle, w, k) })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const c = await kontext(req);
  if ("antwort" in c) return c.antwort;
  const p = z
    .object({
      vorname: z.string().trim().min(1).max(60),
      geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      stunden: z.number().int().min(15).max(50),
      beginn: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      kitas: z.array(z.string().max(60)).min(1).max(MAX_WUENSCHE),
      hinweis: z.string().trim().max(500).optional(),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  if ((await wuenscheVon(c.tenant, c.konto.id)).length >= 6) return fehler("zu_viele", 409);
  const heute = new Date().toISOString().slice(0, 7);
  if (p.data.beginn < heute || p.data.geburtsdatum > new Date().toISOString().slice(0, 10)) return fehler("datum");
  try {
    const { vorname, geburtsdatum, stunden, hinweis, beginn, kitas } = p.data;
    const w = await meldeBedarf(c.tenant, c.konto.id, { vorname, geburtsdatum, stunden, hinweis }, beginn, kitas);
    return Response.json({ ok: true, id: w.id }, { status: 201 });
  } catch {
    return fehler("keine_passende_kita", 422);
  }
}

export async function PATCH(req: Request) {
  const c = await kontext(req);
  if ("antwort" in c) return c.antwort;
  const p = z.object({ id: z.string().max(40), aktion: z.enum(["annehmen", "ablehnen", "zurueckziehen"]) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const w = await ladeWunsch(c.tenant, p.data.id);
  if (!w || w.kontoId !== c.konto.id) return fehler("nicht_gefunden", 404);
  if (p.data.aktion === "zurueckziehen") await zieheZurueck(w);
  else {
    if (!w.angebot) return fehler("kein_angebot", 409);
    await antworte(w, p.data.aktion === "annehmen");
  }
  return Response.json({ ok: true });
}
