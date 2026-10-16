import { tenantAus } from "@/lib/api";
import { aktiv } from "@/lib/funktionen";
import { vapid } from "@/lib/push/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "push")) return Response.json({ aktiv: false });
  return Response.json({ aktiv: true, schluessel: vapid().publicKey });
}
