/**
 * PUT    /api/backoffice/formulare { formular } – eigenes Online-Formular anlegen/ändern (Rolle „admin“)
 * DELETE /api/backoffice/formulare { id }       – eigenes Formular löschen
 * Das Ergebnis wird mit denselben Regeln geprüft wie die Konfigurationsdatei.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { anwenden, ladeAnpassungen, speichereAnpassungen, type AnpassungRecord } from "@/lib/admin/anpassungen";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { pruefeGemeinde } from "@/config/schema";
import { baueLeistung } from "@/lib/formulare/baukasten";
import { getTenantBySlug } from "@/lib/tenant";

export const runtime = "nodejs";

const t = (max: number) => z.string().trim().min(1).max(max);
const Feld = z.object({
  label: t(120),
  typ: z.enum(["text", "textarea", "date", "number", "radio", "select", "checkbox", "email", "tel", "iban"]),
  pflicht: z.boolean(),
  hinweis: z.string().trim().max(200).optional(),
  optionen: z.array(z.string().trim().max(80)).max(20).optional(),
});
const Schema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  aktiv: z.boolean(),
  titel: t(100),
  kurz: z.string().trim().min(10).max(400),
  amtId: t(60),
  stichworte: z.array(z.string().trim().max(60)).max(30),
  unterlagen: z.array(z.string().trim().max(200)).max(20),
  ablauf: z.array(z.string().trim().max(200)).max(10),
  gebuehr: z.number().min(0).max(100000).nullable().optional(),
  onlineBezahlen: z.boolean(),
  kontakt: z.enum(["kurz", "voll"]),
  aufbewahrungTage: z.number().int().min(30).max(3650),
  schritte: z.array(z.object({ titel: t(100), beschreibung: z.string().trim().max(300).optional(), felder: z.array(Feld).min(1).max(30) })).min(1).max(8),
});

async function kontext(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c;
  if (!hatRolle(c.b, "admin")) return { antwort: fehler("keine_berechtigung", 403) };
  const basis = getTenantBySlug((await tenantAus(req)).slug);
  const alt = await ladeAnpassungen(basis.slug);
  const record: AnpassungRecord = alt ?? { id: basis.slug, tenant: basis.slug, leistungen: {}, erstelltAm: new Date().toISOString(), loeschenAm: "9999-12-31T00:00:00.000Z" };
  return { ...c, basis, record };
}

export async function PUT(req: Request) {
  const c = await kontext(req);
  if ("antwort" in c) return c.antwort;
  const p = Schema.safeParse((await leseJson(req, 128_000).catch(() => null) as { formular?: unknown } | null)?.formular);
  if (!p.success) return fehler("ungueltige_anfrage", 400, { probleme: p.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) });
  const eigene = c.record.eigeneLeistungen ?? [];
  if (p.data.id && (c.basis.leistungen.some((l) => l.id === p.data.id) || !eigene.some((l) => l.id === p.data.id))) return fehler("nicht_gefunden", 404);
  for (const s of p.data.schritte) for (const f of s.felder) if ((f.typ === "radio" || f.typ === "select") && !(f.optionen ?? []).filter(Boolean).length) return fehler("validierung", 422, { probleme: [`„${f.label}“: Auswahlfeld ohne Optionen`] });

  const belegt = new Set([...c.basis.leistungen.map((l) => l.id), ...eigene.map((l) => l.id)]);
  const leistung = baueLeistung(p.data, belegt, c.basis.kontakt.ort);
  const record: AnpassungRecord = { ...c.record, eigeneLeistungen: [...eigene.filter((l) => l.id !== leistung.id), leistung], geaendertVon: c.b.name };
  const probleme = pruefeGemeinde(anwenden(c.basis, record));
  if (probleme.length) return fehler("validierung", 422, { probleme });
  await speichereAnpassungen(record);
  await protokolliere({ tenant: c.basis.slug, benutzer: c.b.name, aktion: "formular_geaendert", details: `${leistung.id}${p.data.id ? "" : " (neu)"}` });
  return Response.json({ ok: true, id: leistung.id });
}

export async function DELETE(req: Request) {
  const c = await kontext(req);
  if ("antwort" in c) return c.antwort;
  const p = z.object({ id: z.string().max(60) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const eigene = c.record.eigeneLeistungen ?? [];
  if (!eigene.some((l) => l.id === p.data.id)) return fehler("nicht_gefunden", 404);
  const record: AnpassungRecord = { ...c.record, eigeneLeistungen: eigene.filter((l) => l.id !== p.data.id), geaendertVon: c.b.name };
  // Verweise (z. B. eine Rückfrage des Assistenten) dürfen nicht ins Leere zeigen
  const probleme = pruefeGemeinde(anwenden(c.basis, record));
  if (probleme.length) return fehler("validierung", 422, { probleme });
  await speichereAnpassungen(record);
  await protokolliere({ tenant: c.basis.slug, benutzer: c.b.name, aktion: "formular_geaendert", details: `${p.data.id} (gelöscht)` });
  return Response.json({ ok: true });
}
