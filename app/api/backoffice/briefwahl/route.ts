/**
 * POST – Briefwahl im Backoffice (zuständiges Amt, wird protokolliert):
 *   { aktion: "anlegen", titel, datum, antragBis? } · { aktion: "loeschen", id } · { aktion: "versandt", ids }
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { boZugang } from "@/lib/backoffice/zugang";
import { antraegeFuer, legeWahlAn, loescheWahl } from "@/lib/briefwahl/service";
import { darfWahlamt } from "@/lib/briefwahl/zugang";
import { BRIEFWAHL_ID } from "@/lib/briefwahl/wahlen";
import { aktiv } from "@/lib/funktionen";
import { ladeVorgang, setzeStatus } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Schema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("anlegen"), titel: z.string().trim().min(3).max(120), datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), antragBis: z.string().datetime({ offset: true }).optional() }),
  z.object({ aktion: z.literal("loeschen"), id: z.string().max(40) }),
  z.object({ aktion: z.literal("versandt"), ids: z.array(z.string().max(40)).min(1).max(500) }),
]);

export async function POST(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!aktiv(c.tenant, "briefwahl")) return fehler("nicht_im_paket", 404);
  if (!darfWahlamt(c.tenant, c.b)) return fehler("keine_berechtigung", 403);
  const p = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const d = p.data;
  if (d.aktion === "anlegen") {
    if (d.datum < new Date().toISOString().slice(0, 10)) return fehler("ungueltige_anfrage");
    const w = await legeWahlAn(c.tenant, { titel: d.titel, datum: d.datum, antragBis: d.antragBis }, c.b.name);
    await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "briefwahl", details: `Wahl angelegt: ${w.titel} (${w.datum})` });
    return Response.json({ id: w.id }, { status: 201 });
  }
  if (d.aktion === "loeschen") {
    if ((await antraegeFuer(c.tenant, d.id)).length) return fehler("antraege_vorhanden", 409);
    if (!(await loescheWahl(c.tenant, d.id))) return fehler("nicht_gefunden", 404);
    await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "briefwahl", details: `Wahl gelöscht: ${d.id}` });
    return Response.json({ ok: true });
  }
  let n = 0;
  for (const id of d.ids) {
    const v = await ladeVorgang(c.tenant, id);
    if (!v || v.leistungId !== BRIEFWAHL_ID || v.status === "erledigt") continue;
    await setzeStatus(v, "erledigt", c.b.name, c.tenant);
    n++;
  }
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "briefwahl", details: `Unterlagen versandt: ${n} Anträge` });
  return Response.json({ ok: true, anzahl: n });
}
