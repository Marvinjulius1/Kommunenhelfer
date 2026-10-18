/** GET – Wappen einer im Portal angelegten Gemeinde. SVG ohne aktive Inhalte (geprüft beim Hochladen, hier zusätzlich per CSP). */
import { dynamischerMandant } from "@/lib/mandanten/service";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = await dynamischerMandant((await params).slug);
  if (!m) return new Response(null, { status: 404 });
  const body = m.wappen.typ === "image/png" ? new Uint8Array(Buffer.from(m.wappen.daten, "base64")) : m.wappen.daten;
  return new Response(body, {
    headers: { "content-type": m.wappen.typ, "cache-control": "public, max-age=3600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'", "x-content-type-options": "nosniff" },
  });
}
