import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { demoModus } from "@/lib/demo";
import { findeKontoPerEmail, kontoToken, mailAktiv } from "@/lib/konto/service";
import { sendMail } from "@/lib/mail";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`konto-pw:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const b = z.object({ email: z.string().trim().email().max(200) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const k = await findeKontoPerEmail(tenant, b.data.email);
  let testLink: string | undefined;
  if (k) {
    const link = `${basisUrl(req, tenant)}/konto/passwort-neu?token=${kontoToken("passwort", k.id, 2)}`;
    if (mailAktiv()) {
      await sendMail(tenant, { to: b.data.email, subject: "Neues Passwort für Ihr Bürgerkonto", text: `Über diesen Link vergeben Sie ein neues Passwort (2 Stunden gültig):\n${link}\n\nWenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail.\n\n${tenant.email.absenderName}` }).catch(() => undefined);
    } else if (demoModus()) {
      testLink = link; // Ohne E-Mail-Versand zeigen wir den Link im Testmodus direkt an
    }
  }
  // Immer dieselbe Antwort – verrät nicht, ob es ein Konto gibt
  return Response.json({ ok: true, testLink });
}
