/** GET /api/konto/hinweise/ics – Hinweise mit Datum als Kalenderdatei (ganztägige Einträge). */
import { tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { hinweiseFuer } from "@/lib/konto/uebersicht";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const esc = (s: string) => s.replace(/[\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const tag = (d: string) => d.replace(/-/g, "");
  const stempel = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const eintraege = (await hinweiseFuer(tenant, ctx.konto))
    .filter((h) => h.datum)
    .flatMap((h) => {
      const ende = new Date(Date.parse(h.datum + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
      return [
        "BEGIN:VEVENT",
        `UID:${createUid(h.id)}@${tenant.slug}`,
        `DTSTAMP:${stempel}`,
        `DTSTART;VALUE=DATE:${tag(h.datum!)}`,
        `DTEND;VALUE=DATE:${tag(ende)}`,
        `SUMMARY:${esc(h.titel)}`,
        h.text ? `DESCRIPTION:${esc(h.text)}` : "",
        "END:VEVENT",
      ].filter(Boolean);
    });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Buergerportal//DE", `X-WR-CALNAME:${esc(`${tenant.name} – Was steht an`)}`, ...eintraege, "END:VCALENDAR"].join("\r\n");
  return new Response(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="was-steht-an.ics"', "Cache-Control": "no-store" },
  });
}

function createUid(id: string) {
  return Buffer.from(id).toString("base64url");
}
