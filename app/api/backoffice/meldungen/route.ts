/** POST { titel, text, ortsteil?, gueltigBis, wichtig, push } – Meldung veröffentlichen · DELETE { id } */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { aktuellerBenutzer, gleicheHerkunft, hatRolle } from "@/lib/backoffice/auth";
import { entferneMeldung, veroeffentliche } from "@/lib/meldungen/service";

export const runtime = "nodejs";

async function pruefen(req: Request) {
  if (!gleicheHerkunft(req)) return { antwort: fehler("herkunft", 403) };
  const tenant = await tenantAus(req);
  const b = await aktuellerBenutzer(tenant);
  if (!b) return { antwort: fehler("nicht_angemeldet", 401) };
  if (!hatRolle(b, "redaktion")) return { antwort: fehler("keine_berechtigung", 403) };
  return { tenant, b };
}

export async function POST(req: Request) {
  const c = await pruefen(req);
  if ("antwort" in c) return c.antwort;
  const d = z
    .object({
      titel: z.string().trim().min(3).max(120),
      text: z.string().trim().min(3).max(2000),
      ortsteil: z.string().max(60).optional(),
      gueltigBis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      wichtig: z.boolean().default(false),
      push: z.boolean().default(false),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  if (d.data.ortsteil && !c.tenant.ortsteile?.includes(d.data.ortsteil)) return fehler("ungueltige_anfrage");
  // Ende des Tages in Deutschland – 21:59 UTC ist im Sommer 23:59, im Winter 22:59 Ortszeit
  const bis = new Date(d.data.gueltigBis + "T21:59:59Z");
  if (Number.isNaN(bis.getTime()) || bis < new Date()) return fehler("ungueltige_anfrage");
  const r = await veroeffentliche(c.tenant, { ...d.data, ortsteil: d.data.ortsteil || undefined, gueltigBis: bis.toISOString(), autor: c.b.name });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "meldung_veroeffentlicht", details: `${r.meldung.titel}${r.gesendet ? ` · Push an ${r.gesendet}` : ""}` });
  return Response.json({ id: r.meldung.id, gesendet: r.gesendet }, { status: 201 });
}

export async function DELETE(req: Request) {
  const c = await pruefen(req);
  if ("antwort" in c) return c.antwort;
  const d = z.object({ id: z.string().max(40) }).safeParse(await leseJson(req).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  if (!(await entferneMeldung(c.tenant, d.data.id))) return fehler("nicht_gefunden", 404);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "meldung_entfernt", details: d.data.id });
  return Response.json({ ok: true });
}
