/**
 * POST /api/antrag
 * Reicht ein geführtes Formular ein. Die Daten werden serverseitig mit
 * denselben Regeln wie im Browser geprüft und verschlüsselt gespeichert.
 */
import { z } from "zod";
import { fehler, langAus, leseJson, tenantAus } from "@/lib/api";
import { validiereFormular } from "@/lib/flows/validate";
import { gatewayFuer } from "@/lib/integrations";
import { sendMail } from "@/lib/mail";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { findeLeistung } from "@/lib/tenant";
import { tx } from "@/lib/i18n";

export const runtime = "nodejs";

const Schema = z.object({
  leistungId: z.string().max(80),
  werte: z.record(z.string(), z.string().max(2000)),
  einwilligungen: z.record(z.string(), z.literal(true)),
  lang: z.string().max(5).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`antrag:${clientKey(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req, 64_000));
  } catch {
    return fehler("ungueltige_anfrage");
  }

  const tenant = tenantAus(req);
  const lang = langAus(req, tenant, body.lang);
  const leistung = findeLeistung(tenant, body.leistungId);
  if (!leistung?.online || !leistung.formular) return fehler("leistung_nicht_online", 404);

  // Alle Pflicht-Bestätigungen + Datenschutz müssen vorliegen.
  const noetig = ["datenschutz", ...(leistung.formular.bestaetigungen ?? []).map((b) => b.id)];
  if (!noetig.every((id) => body.einwilligungen[id])) return fehler("einwilligung_fehlt");

  const pruefung = validiereFormular(leistung.formular, body.werte, lang);
  if (!pruefung.ok) return fehler("validierung", 422, { felder: pruefung.fehler });

  const ergebnis = await gatewayFuer(leistung).einreichen({ tenant, leistung, daten: pruefung.werte });

  const titel = tx(leistung.titel, lang);
  const email = pruefung.werte.email;
  if (email) {
    await sendMail(tenant, {
      to: email,
      subject: `Eingangsbestätigung: ${titel} (${ergebnis.vorgangsnummer})`,
      text: [
        `Guten Tag ${pruefung.werte.vorname ?? ""} ${pruefung.werte.nachname ?? ""},`.replace(/\s+,/, ","),
        "",
        `vielen Dank. Ihr Antrag „${titel}“ ist bei der ${tenant.art} ${tenant.name} eingegangen.`,
        "",
        `Vorgangsnummer: ${ergebnis.vorgangsnummer}`,
        "",
        "So geht es weiter:",
        ...leistung.ablauf.slice(1).map((s, i) => `${i + 1}. ${tx(s, lang)}`),
        "",
        "Den aktuellen Stand sehen Sie jederzeit unter „Meine Anliegen“ auf dem Gerät, mit dem Sie den Antrag gestellt haben.",
        "",
        "Freundliche Grüße",
        tenant.email.absenderName,
      ].join("\n"),
    }).catch((e) => console.error("[mail] Versand fehlgeschlagen:", (e as Error).message));
  }

  return Response.json({ ...ergebnis, titel }, { status: 201 });
}
