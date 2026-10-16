import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { anmelden, erstelleKonto, findeKontoPerEmail, kontoToken, mailAktiv } from "@/lib/konto/service";
import { sendMail } from "@/lib/mail";
import { hashPasswort, passwortGenuegend } from "@/lib/passwort";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { zaehle } from "@/lib/statistik";

export const runtime = "nodejs";

const Schema = z.object({
  vorname: z.string().trim().min(1).max(80),
  nachname: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  passwort: z.string().max(200),
  einwilligung: z.literal(true),
});

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "konto")) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`konto-reg:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let b: z.infer<typeof Schema>;
  try {
    b = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  if (!passwortGenuegend(b.passwort)) return fehler("passwort_zu_kurz");
  if (await findeKontoPerEmail(tenant, b.email)) return fehler("email_vergeben", 409);

  const k = await erstelleKonto(tenant, {
    profil: { vorname: b.vorname, nachname: b.nachname, email: b.email },
    passwortHash: hashPasswort(b.passwort),
    vertrauensniveau: "basis",
    emailBestaetigt: !mailAktiv(),
  });
  if (mailAktiv()) {
    const link = `${basisUrl(req, tenant)}/api/konto/bestaetigen?token=${kontoToken("bestaetigen", k.id, 48)}`;
    await sendMail(tenant, {
      to: b.email,
      subject: `Bitte bestätigen Sie Ihr Bürgerkonto`,
      text: `Guten Tag ${b.vorname} ${b.nachname},\n\nbitte bestätigen Sie Ihre E-Mail-Adresse:\n${link}\n\nDer Link ist 48 Stunden gültig.\n\n${tenant.email.absenderName}`,
    }).catch(() => undefined);
  }
  await anmelden(k);
  await zaehle(tenant.slug, "konten_neu");
  return Response.json({ ok: true, bestaetigungNoetig: mailAktiv() }, { status: 201 });
}
