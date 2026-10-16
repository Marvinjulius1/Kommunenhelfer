import { z } from "zod";
import { tenantAus } from "@/lib/api";
import { abmelden } from "@/lib/konto/service";

export async function POST(req: Request) {
  await tenantAus(req);
  const alle = z.object({ alle: z.boolean().optional() }).safeParse(await req.json().catch(() => ({}))).data?.alle;
  await abmelden(!!alle);
  return Response.json({ ok: true });
}
