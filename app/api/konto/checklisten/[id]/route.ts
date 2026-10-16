/** PATCH { schritt, erledigt } oder { stichtag } · DELETE */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { checklisteSicht, inhalt, ladeCheckliste, speichereCheckliste } from "@/lib/lebenslagen/service";
import { store } from "@/lib/storage/store";

export const runtime = "nodejs";

const Datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d + "T00:00:00Z")));

async function laden(req: Request, id: string) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx;
  const c = await ladeCheckliste(ctx.konto, id);
  return c ? { tenant, konto: ctx.konto, c } : { antwort: fehler("nicht_gefunden", 404) };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const x = await laden(req, (await params).id);
  if ("antwort" in x) return x.antwort;
  const b = z
    .union([z.object({ schritt: z.string().max(60), erledigt: z.boolean() }), z.object({ stichtag: Datum })])
    .safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const i = inhalt(x.c);
  if ("stichtag" in b.data) {
    i.stichtag = b.data.stichtag;
    i.erinnert = []; // neue Fristen → neue Erinnerungen
  } else {
    const s = new Set(i.erledigt);
    if (b.data.erledigt) s.add(b.data.schritt);
    else s.delete(b.data.schritt);
    i.erledigt = [...s];
  }
  const r = await speichereCheckliste(x.konto, i, x.c.id, x.c.erstelltAm);
  return Response.json(checklisteSicht(x.tenant, r));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const x = await laden(req, (await params).id);
  if ("antwort" in x) return x.antwort;
  await store().delete("checklisten", x.c.id);
  return Response.json({ ok: true });
}
