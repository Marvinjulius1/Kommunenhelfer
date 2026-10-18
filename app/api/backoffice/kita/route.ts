/** PATCH { id, kitaId, aktion: "anbieten" | "absagen" } – Kita bietet einen Platz an oder sagt ab. */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { amtFuer, boZugang } from "@/lib/backoffice/zugang";
import { darfAmt } from "@/lib/backoffice/auth";
import { absagenDurchKita, bieteAn, ladeWunsch } from "@/lib/kita/service";
import { tx } from "@/lib/i18n";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  const amt = amtFuer(c.tenant, "kita");
  if (!darfAmt(c.b, amt.id)) return fehler("keine_berechtigung", 403);
  const p = z.object({ id: z.string().max(40), kitaId: z.string().max(60), aktion: z.enum(["anbieten", "absagen"]) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const w = await ladeWunsch(c.tenant, p.data.id);
  const kita = c.tenant.kitas?.find((k) => k.id === p.data.kitaId);
  if (!w || !kita || !w.kitas.includes(kita.id)) return fehler("nicht_gefunden", 404);
  try {
    if (p.data.aktion === "anbieten") await bieteAn(c.tenant, w, kita, `${kita.name} · ${tx(amt.name, "de")}`);
    else await absagenDurchKita(w, kita.id);
  } catch {
    return fehler("nicht_moeglich", 409);
  }
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "kita", details: `${kita.id}: ${p.data.aktion}` });
  return Response.json({ ok: true });
}
