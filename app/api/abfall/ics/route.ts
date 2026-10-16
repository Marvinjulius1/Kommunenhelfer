/** GET /api/abfall/ics?bezirk=<id>&arten=rest,bio – Abfallkalender als iCalendar-Datei (12 Monate). */
import { fehler, tenantAus } from "@/lib/api";
import { abfuhren, findeBezirk, ics } from "@/lib/abfall/kalender";
import { plusTage } from "@/lib/feiertage";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "abfall") || !tenant.abfall) return fehler("nicht_gefunden", 404);
  const url = new URL(req.url);
  const bezirk = findeBezirk(tenant, url.searchParams.get("bezirk") ?? undefined);
  if (!bezirk) return fehler("nicht_gefunden", 404);
  const arten = new Set((url.searchParams.get("arten") ?? "").split(",").filter(Boolean));
  const heute = new Date().toISOString().slice(0, 10);
  const liste = abfuhren(tenant.abfall, bezirk, heute, plusTage(heute, 365)).filter((a) => !arten.size || arten.has(a.art));
  const label = (art: string) => tx(tenant.abfall!.arten.find((a) => a.id === art)?.label ?? art, "de");
  return new Response(ics(tenant, bezirk, liste, label), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="abfallkalender-${bezirk.id}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
