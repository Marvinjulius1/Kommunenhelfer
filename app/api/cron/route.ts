/**
 * GET /api/cron – tägliche Aufgaben (Erinnerungen, Löschfristen).
 * Aufruf nur mit "Authorization: Bearer <CRON_SECRET>" (Vercel Cron sendet das automatisch).
 */
import { timingSafeEqual } from "node:crypto";
import { fehler } from "@/lib/api";
import { taeglich } from "@/lib/cron/aufgaben";
import { demoModus } from "@/lib/demo";
import { alleGemeinden } from "@/lib/mandanten/service";
import { mitAnpassungen } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function berechtigt(req: Request): boolean {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) return demoModus(); // ohne Geheimnis nur in Entwicklung/Demo
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${geheim}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!berechtigt(req)) return fehler("nicht_berechtigt", 401);
  const ergebnis = await taeglich(await Promise.all((await alleGemeinden()).map((g) => mitAnpassungen(g.config))));
  return Response.json({ ok: true, ergebnis });
}
