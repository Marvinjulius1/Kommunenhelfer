/** GET /api/konto/anliegen – alle Vorgänge und Termine des angemeldeten (bzw. vertretenen) Kontos. */
import { fehler, tenantAus } from "@/lib/api";
import { aktiv } from "@/lib/funktionen";
import { handelndesKonto } from "@/lib/konto/vertretung";
import { anliegenVon } from "@/lib/konto/service";
import { terminSicht, vorgangExtras, vorgangSicht } from "@/lib/vorgaenge/sicht";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "konto")) return fehler("nicht_verfuegbar", 404);
  // Bei einer Vertretung: die Anliegen der vertretenen Person (Termine nur mit diesem Umfang)
  const h = await handelndesKonto(tenant, "antraege");
  if (!h) return fehler("nicht_angemeldet", 401);
  const mitTerminen = !h.vollmacht || h.vollmacht.umfang.includes("termine");
  const { vorgaenge, termine: alleTermine } = await anliegenVon(h.konto);
  const termine = mitTerminen ? alleTermine : [];
  const mitExtras = await Promise.all(vorgaenge.map(async (v) => ({ ...vorgangSicht(tenant, v), ...(await vorgangExtras(tenant, v)) })));
  const eintraege = [...mitExtras, ...termine.map((t) => terminSicht(tenant, t))].sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
  return Response.json({ eintraege }, { headers: { "Cache-Control": "no-store" } });
}
