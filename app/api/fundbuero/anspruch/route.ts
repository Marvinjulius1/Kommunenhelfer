/** POST { fundId, merkmale, kontakt, einwilligung } – „Das gehört mir“: Anspruch beim Fundbüro melden. */
import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { ladeFund } from "@/lib/fundbuero/service";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto } from "@/lib/konto/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { erstelleVorgang } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Schema = z.object({
  fundId: z.string().max(40),
  merkmale: z.string().trim().min(5).max(1000),
  kontakt: z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), telefon: z.string().trim().max(40).optional() }),
  einwilligung: z.literal(true),
});

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "fundbuero")) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`fund:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const b = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const fund = await ladeFund(tenant, b.data.fundId);
  if (!fund) return fehler("nicht_gefunden", 404);
  const amt = tenant.aemter.find((a) => a.zustaendigkeiten?.includes("fundsache")) ?? tenant.aemter.find((a) => a.id === tenant.uploads.standardAmtId)!;
  const konto = await aktuellesKonto(tenant);
  const r = await erstelleVorgang({
    tenant,
    quelle: "formular",
    amtId: amt.id,
    kontoId: konto?.id,
    daten: {
      kontakt: b.data.kontakt,
      nachricht: `Anspruch auf Fundsache „${fund.bezeichnung}“ (gefunden am ${fund.funddatum}, ${fund.fundort}).\n\nErkennungsmerkmale laut Bürger:\n${b.data.merkmale}`,
    },
    aufbewahrungTage: 90,
    basisUrl: basisUrl(req, tenant),
  });
  return Response.json(r, { status: 201 });
}
