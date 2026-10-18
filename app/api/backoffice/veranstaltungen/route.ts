/**
 * Redaktion (Rolle „redaktion“):
 * POST   { art: "veranstaltung", … } | { art: "ehrenamt", … } – anlegen
 * DELETE { id }                                              – eigene Veranstaltung entfernen
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { entferneVeranstaltung, legeEhrenamtAn, legeVeranstaltungAn } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

const zeit = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const t = (max: number) => z.string().trim().min(1).max(max);
const Veranstaltung = z.object({
  art: z.literal("veranstaltung"),
  titel: t(120),
  text: t(2000),
  beginn: zeit,
  ende: zeit.optional(),
  ort: t(160),
  kategorie: t(40),
  ferienprogramm: z.boolean().optional(),
  anmeldung: z.boolean().optional(),
  plaetze: z.number().int().min(1).max(5000).optional(),
  kosten: z.string().trim().max(60).optional(),
  alter: z.string().trim().max(40).optional(),
});
const Ehrenamt = z.object({ art: z.literal("ehrenamt"), titel: t(120), organisation: t(120), text: t(2000), ort: t(160), zeit: t(120), kategorie: t(40), kontaktEmail: z.string().email().optional(), bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function POST(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!hatRolle(c.b, "redaktion")) return fehler("keine_berechtigung", 403);
  const p = z.discriminatedUnion("art", [Veranstaltung, Ehrenamt]).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  if (p.data.art === "veranstaltung") {
    const { art: _, ...v } = p.data;
    if (v.ende && v.ende < v.beginn) return fehler("ende_vor_beginn");
    const r = await legeVeranstaltungAn(c.tenant, { ...v, ferienprogramm: v.ferienprogramm || undefined, kategorie: v.ferienprogramm ? "Ferienprogramm" : v.kategorie }, c.b.name);
    await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "veranstaltung", details: `angelegt: ${r.titel}` });
    return Response.json({ ok: true, id: r.id }, { status: 201 });
  }
  const { art: _, ...e } = p.data;
  const r = await legeEhrenamtAn(c.tenant, { ...e, autor: c.b.name });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "ehrenamt", details: `angelegt: ${r.titel}` });
  return Response.json({ ok: true, id: r.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!hatRolle(c.b, "redaktion")) return fehler("keine_berechtigung", 403);
  const p = z.object({ id: z.string().max(40) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success || !(await entferneVeranstaltung(c.tenant, p.data.id))) return fehler("nicht_gefunden", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "veranstaltung", details: `entfernt: ${p.data.id}` });
  return Response.json({ ok: true });
}
