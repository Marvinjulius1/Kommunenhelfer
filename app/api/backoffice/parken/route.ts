/** POST – Verwarnungsgeld erfassen (Ordnungsamt). Im Echtbetrieb per Import aus dem Fachverfahren. */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { darfAmt } from "@/lib/backoffice/auth";
import { amtFuer, boZugang } from "@/lib/backoffice/zugang";
import { erfasse, finde } from "@/lib/parken/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!darfAmt(c.b, amtFuer(c.tenant, "parken").id)) return fehler("keine_berechtigung", 403);
  const p = z
    .object({
      aktenzeichen: z.string().trim().min(4).max(30),
      kennzeichen: z.string().trim().min(3).max(15),
      betrag: z.number().min(5).max(1000),
      tatbestand: z.string().trim().min(3).max(200),
      tatzeit: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      tatort: z.string().trim().min(2).max(160),
    })
    .safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  if (await finde(c.tenant, p.data.aktenzeichen, p.data.kennzeichen)) return fehler("doppelt", 409);
  const r = await erfasse(c.tenant, { ...p.data, betragCent: Math.round(p.data.betrag * 100) }, c.b.name);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "verwarnung", details: `erfasst: ${r.aktenzeichen}` });
  return Response.json({ ok: true }, { status: 201 });
}
