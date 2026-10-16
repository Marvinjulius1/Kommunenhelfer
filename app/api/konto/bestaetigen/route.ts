import { tenantAus } from "@/lib/api";
import { ladeKonto, pruefeKontoToken, speichereKonto } from "@/lib/konto/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const id = pruefeKontoToken("bestaetigen", new URL(req.url).searchParams.get("token"));
  const k = id ? await ladeKonto(tenant, id) : undefined;
  if (k) await speichereKonto({ ...k, emailBestaetigt: true });
  return Response.redirect(new URL(k ? "/konto?bestaetigt=1" : "/konto?bestaetigt=0", req.url), 303);
}
