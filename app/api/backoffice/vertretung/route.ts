/** POST { vertreter, von, bis } – eigene Abwesenheit eintragen · DELETE { id } – entfernen */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { benutzerListe } from "@/lib/backoffice/auth";
import { entferneVertretung, setzeVertretung } from "@/lib/backoffice/vertretung";
import { boZugang } from "@/lib/backoffice/zugang";

export const runtime = "nodejs";

const Datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function POST(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  const d = z.object({ vertreter: z.string().max(60), von: Datum, bis: Datum }).safeParse(await leseJson(req).catch(() => null));
  if (!d.success || d.data.bis < d.data.von || d.data.vertreter === c.b.name) return fehler("ungueltige_anfrage");
  const gibt = benutzerListe().some((x) => x.name === d.data.vertreter && (x.gemeinde === "*" || x.gemeinde === c.tenant.slug));
  if (!gibt) return fehler("ungueltige_anfrage");
  const r = await setzeVertretung(c.tenant, { benutzer: c.b.name, ...d.data });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "vertretung", details: `${d.data.von}–${d.data.bis} → ${d.data.vertreter}` });
  return Response.json({ id: r.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  const d = z.object({ id: z.string().max(40) }).safeParse(await leseJson(req).catch(() => null));
  if (!d.success || !(await entferneVertretung(c.tenant, d.data.id, c.b.name))) return fehler("nicht_gefunden", 404);
  return Response.json({ ok: true });
}
