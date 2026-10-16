import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { anmelden, findeKontoPerEmail } from "@/lib/konto/service";
import { pruefePasswort } from "@/lib/passwort";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Schema = z.object({ email: z.string().trim().max(200), passwort: z.string().max(200) });

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "konto")) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`konto-login:${clientKey(req)}`, 10, 15 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let b: z.infer<typeof Schema>;
  try {
    b = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const k = await findeKontoPerEmail(tenant, b.email);
  // Gleiche Antwort für "unbekannt" und "falsches Passwort" (keine Konten erraten)
  if (!k?.passwortHash || !pruefePasswort(b.passwort, k.passwortHash)) return fehler("anmeldung", 401);
  await anmelden(k);
  return Response.json({ ok: true });
}
