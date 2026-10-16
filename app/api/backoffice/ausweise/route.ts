/** POST { nummer, status, art? } – Ausweis-Status setzen; „abholbereit“ benachrichtigt vorgemerkte Konten. */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { normalisiereNummer, setzeAusweisStatus } from "@/lib/ausweis/service";
import { protokolliere } from "@/lib/backoffice/audit";
import { amtFuer, boZugang } from "@/lib/backoffice/zugang";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  const c = await boZugang(req, amtFuer(tenant, "personalausweis").id);
  if ("antwort" in c) return c.antwort;
  const d = z
    .object({
      nummer: z.string().max(40),
      status: z.enum(["in_produktion", "abholbereit", "abgeholt"]),
      art: z.enum(["personalausweis", "reisepass", "kinderreisepass", "eat"]).optional(),
    })
    .safeParse(await leseJson(req).catch(() => null));
  const nummer = d.success ? normalisiereNummer(d.data.nummer) : undefined;
  if (!d.success || !nummer) return fehler("ungueltige_nummer");
  const r = await setzeAusweisStatus(c.tenant, nummer, d.data.status, d.data.art);
  // Die Nummer selbst kommt nicht ins Protokoll – nur die letzten Zeichen
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "ausweis_status", details: `…${nummer.slice(-3)}: ${d.data.status}` });
  return Response.json({ ok: true, benachrichtigt: r.benachrichtigt });
}
