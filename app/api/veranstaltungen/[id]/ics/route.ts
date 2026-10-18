/** GET – Veranstaltung als Kalendereintrag. */
import { fehler, tenantAus } from "@/lib/api";
import { veranstaltung, veranstaltungIcs } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await tenantAus(req);
  const v = await veranstaltung(tenant, (await params).id);
  if (!v) return fehler("nicht_gefunden", 404);
  return new Response(veranstaltungIcs(tenant, v), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${v.id}.ics"` } });
}
