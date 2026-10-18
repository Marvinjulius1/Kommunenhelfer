/**
 * Betreiber-Bereich (Benutzer mit gemeinde "*" und Rolle admin):
 * POST   – neue Gemeinde oder Demo-Gemeinde anlegen
 * PATCH  { slug, paket?, einwohner? }
 * DELETE { slug } – nur im Portal angelegte Gemeinden
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { aendereMandant, legeMandantAn, loescheMandant, svgSicher } from "@/lib/mandanten/service";

export const runtime = "nodejs";

async function betreiber(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c;
  if (c.b.gemeinde !== "*" || !hatRolle(c.b, "admin")) return { antwort: fehler("keine_berechtigung", 403) };
  return c;
}

const Neu = z.object({
  name: z.string().trim().min(2).max(60),
  art: z.enum(["Stadt", "Gemeinde", "Markt", "Samtgemeinde", "Verbandsgemeinde", "Landkreis"]),
  farbe: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  einwohner: z.number().int().min(1).max(5_000_000).optional(),
  paket: z.enum(["basis", "komfort", "premium"]),
  demo: z.boolean(),
  email: z.string().trim().email(),
  strasse: z.string().trim().min(2).max(120),
  plz: z.string().regex(/^\d{5}$/),
  ort: z.string().trim().max(80).optional(),
  wappen: z.object({ typ: z.enum(["image/svg+xml", "image/png"]), daten: z.string().max(420_000) }).optional(),
});

export async function POST(req: Request) {
  const c = await betreiber(req);
  if ("antwort" in c) return c.antwort;
  const p = Neu.safeParse(await leseJson(req, 500_000).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const w = p.data.wappen;
  if (w?.typ === "image/svg+xml" && !svgSicher(w.daten)) return fehler("wappen_unsicher", 422);
  if (w?.typ === "image/png" && !Buffer.from(w.daten, "base64").subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return fehler("wappen_format", 422);
  const r = await legeMandantAn(p.data, c.b.name);
  if ("probleme" in r) return fehler("validierung", 422, { probleme: r.probleme });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "anpassung", details: `Gemeinde angelegt: ${r.mandant!.id}${p.data.demo ? " (Demo)" : ""}` });
  return Response.json({ ok: true, slug: r.mandant!.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const c = await betreiber(req);
  if ("antwort" in c) return c.antwort;
  const p = z.object({ slug: z.string().max(40), paket: z.enum(["basis", "komfort", "premium"]).optional(), einwohner: z.number().int().min(1).max(5_000_000).optional() }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const { slug, ...rest } = p.data;
  if (!(await aendereMandant(slug, rest))) return fehler("nur_portal_gemeinden", 404);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const c = await betreiber(req);
  if ("antwort" in c) return c.antwort;
  const p = z.object({ slug: z.string().max(40) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success || !(await loescheMandant(p.data.slug))) return fehler("nicht_moeglich", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "anpassung", details: `Gemeinde gelöscht: ${p.data.slug}` });
  return Response.json({ ok: true });
}
