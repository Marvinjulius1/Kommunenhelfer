/**
 * POST /api/backoffice/vorgang/[id]/bescheid (multipart/form-data)
 *   titel, text, datei (PDF, optional), erledigt ("1" = Vorgang abschließen)
 * Stellt einen Bescheid digital ins Postfach des Bürgers zu.
 */
import { fehler } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { stelleZu } from "@/lib/postfach/service";
import { zaehle } from "@/lib/statistik";
import { bereinigeDateiname } from "@/lib/uploads/formate";
import { pruefeDatei } from "@/lib/uploads/service";
import { setzeStatus } from "@/lib/vorgaenge/service";
import { tx } from "@/lib/i18n";
import { vorbereiten } from "@/lib/backoffice/vorgang";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await vorbereiten(req, (await params).id);
  if ("antwort" in ctx) return ctx.antwort;
  const form = await req.formData().catch(() => null);
  if (!form) return fehler("ungueltige_anfrage");
  const titel = String(form.get("titel") ?? "").trim().slice(0, 140);
  const text = String(form.get("text") ?? "").trim().slice(0, 5000);
  if (titel.length < 3) return fehler("titel_fehlt");

  let datei: { daten: Buffer; name: string; typ: "application/pdf" } | undefined;
  const f = form.get("datei");
  if (f instanceof File && f.size) {
    const daten = Buffer.from(await f.arrayBuffer());
    const p = await pruefeDatei(daten, 20, ["application/pdf"]);
    if (!p.ok) return fehler(p.fehler, 422);
    datei = { daten, name: bereinigeDateiname(f.name, "application/pdf"), typ: "application/pdf" };
  }
  const amt = ctx.tenant.aemter.find((a) => a.id === ctx.v.amtId);
  await stelleZu({ tenant: ctx.tenant, art: "bescheid", titel, text: text || "Ihr Bescheid liegt als Dokument bei.", vorgang: ctx.v, datei, absender: amt ? tx(amt.name, "de") : ctx.tenant.name, tage: 365 * 3 });
  await zaehle(ctx.tenant.slug, "bescheide_digital");
  await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "bescheid_zugestellt", vorgangId: ctx.v.id, details: titel });
  if (form.get("erledigt") === "1") await setzeStatus(ctx.v, "erledigt", ctx.b.name);
  return Response.json({ ok: true });
}
