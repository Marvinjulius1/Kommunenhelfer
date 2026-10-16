/** POST /api/backoffice/vorgang/[id]/zahlung { betrag, zweck } – Gebühr anfordern (Bürger zahlt online). */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { tx } from "@/lib/i18n";
import { stelleZu } from "@/lib/postfach/service";
import { euro, legeZahlungAn } from "@/lib/zahlung/service";
import { vorbereiten } from "@/lib/backoffice/vorgang";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await vorbereiten(req, (await params).id);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ betrag: z.number().positive().max(100_000), zweck: z.string().trim().min(3).max(120) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const zahlung = await legeZahlungAn(ctx.tenant, { betragCent: Math.round(b.data.betrag * 100), zweck: `${b.data.zweck} – ${ctx.v.id}`, kontoId: ctx.v.kontoId, vorgangId: ctx.v.id });
  const amt = ctx.tenant.aemter.find((a) => a.id === ctx.v.amtId);
  await stelleZu({
    tenant: ctx.tenant,
    art: "zahlung",
    titel: `Zahlungsaufforderung: ${euro(zahlung.betragCent)}`,
    text: `Für Ihr Anliegen ${ctx.v.id} ist eine Gebühr von **${euro(zahlung.betragCent)}** fällig (${b.data.zweck}).\n\nSie können direkt online bezahlen: unter „Zahlungen“ in Ihrem Konto oder unter „Meine Anliegen“.`,
    vorgang: ctx.v,
    absender: amt ? tx(amt.name, "de") : ctx.tenant.name,
  });
  await protokolliere({ tenant: ctx.tenant.slug, benutzer: ctx.b.name, aktion: "zahlung_angefordert", vorgangId: ctx.v.id, details: euro(zahlung.betragCent) });
  return Response.json({ ok: true, id: zahlung.id });
}
