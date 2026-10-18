/**
 * POST { aktion: "suchen" | "bezahlen" | "stellungnahme", aktenzeichen, kennzeichen, … }
 * Verwarnungsgeld nachsehen, online bezahlen oder Stellung nehmen (Anhörung).
 */
import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { amtFuer } from "@/lib/backoffice/zugang";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { finde, speichere } from "@/lib/parken/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { erstelleVorgang } from "@/lib/vorgaenge/service";
import { legeZahlungAn, ladeZahlung, zahlungZugang } from "@/lib/zahlung/service";

export const runtime = "nodejs";

const Basis = z.object({ aktenzeichen: z.string().trim().min(4).max(30), kennzeichen: z.string().trim().min(3).max(15) });
const Schema = z.discriminatedUnion("aktion", [
  Basis.extend({ aktion: z.literal("suchen") }),
  Basis.extend({ aktion: z.literal("bezahlen") }),
  Basis.extend({ aktion: z.literal("stellungnahme"), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), text: z.string().trim().min(10).max(3000), einwilligung: z.literal(true) }),
]);

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  // Schutz vor Durchprobieren
  const rl = rateLimit(`parken:${clientKey(req)}`, 15, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "parken")) return fehler("nicht_verfuegbar", 404);
  const p = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const v = await finde(tenant, p.data.aktenzeichen, p.data.kennzeichen);
  if (!v) return fehler("nicht_gefunden", 404);
  const sicht = { aktenzeichen: v.aktenzeichen, betragCent: v.betragCent, tatbestand: v.tatbestand, tatzeit: v.tatzeit, tatort: v.tatort, status: v.status };

  if (p.data.aktion === "suchen") return Response.json(sicht, { headers: { "Cache-Control": "no-store" } });

  if (p.data.aktion === "bezahlen") {
    if (v.status === "bezahlt") return fehler("schon_bezahlt", 409);
    // Offene Zahlung wiederverwenden statt neue anzulegen
    const alt = v.zahlungId ? await ladeZahlung(tenant, v.zahlungId) : undefined;
    const z = alt && alt.status === "offen" ? alt : await legeZahlungAn(tenant, { betragCent: v.betragCent, zweck: `Verwarnungsgeld ${v.aktenzeichen}`, kontoId: (await aktuellesKonto(tenant))?.id, bezug: { art: "verwarnung", id: v.id } });
    if (!alt || alt.id !== z.id) await speichere({ ...v, zahlungId: z.id });
    return Response.json({ url: `/bezahlen/${z.id}?t=${encodeURIComponent(zahlungZugang(z))}` });
  }

  if (v.status === "stellungnahme") return fehler("schon_eingereicht", 409);
  const konto = await aktuellesKonto(tenant);
  const amt = amtFuer(tenant, "parken");
  const r = await erstelleVorgang({
    tenant,
    quelle: "formular",
    amtId: amt.id,
    kontoId: konto?.id,
    daten: {
      kontakt: { name: p.data.name, email: p.data.email },
      nachricht: `Stellungnahme zum Verwarnungsgeld ${v.aktenzeichen}\nTatvorwurf: ${v.tatbestand}, ${v.tatort}, ${v.tatzeit.replace("T", " ")} Uhr\n\n${p.data.text}`,
    },
    aufbewahrungTage: 365,
    basisUrl: basisUrl(req, tenant),
  });
  await speichere({ ...v, status: "stellungnahme", vorgangId: r.vorgangsnummer });
  return Response.json({ ...r, ...sicht, status: "stellungnahme" }, { status: 201 });
}
