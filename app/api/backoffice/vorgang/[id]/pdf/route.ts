/** GET – Antragszusammenfassung als PDF (für E-Akte oder Druck, wird protokolliert). */
import { fehler } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { darfAmt } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { vorgangPdf } from "@/lib/vorgaenge/pdf";
import { ladeVorgang } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  const v = await ladeVorgang(c.tenant, (await params).id);
  if (!v || !darfAmt(c.b, v.amtId)) return fehler("nicht_gefunden", 404);
  const pdf = vorgangPdf(c.tenant, v);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "vorgang_exportiert", vorgangId: v.id, details: "PDF-Zusammenfassung" });
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="vorgang-${v.id}.pdf"`, "Cache-Control": "no-store" },
  });
}
