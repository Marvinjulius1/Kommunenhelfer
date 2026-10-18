/**
 * GET /api/karte/kachel/z/x/y – Kartenkachel über den eigenen Server.
 * Bürger laden nichts direkt von Dritten (keine IP-Übertragung an den Kachelserver).
 * Kacheln werden 30 Tage im Datenordner zwischengespeichert (Nutzungsregeln von
 * OpenStreetMap: eigener User-Agent, Zwischenspeicher, nur geringe Last).
 * Nur Kacheln rund um die Gemeinde – kein offener Proxy.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { tenantAus } from "@/lib/api";
import { aktiv } from "@/lib/funktionen";
import { DATA_DIR } from "@/lib/storage/store";
import { kachelErlaubt } from "@/lib/karte";

export const runtime = "nodejs";

const QUELLE = process.env.KARTE_KACHEL_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TAGE = 30;

export async function GET(req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const tenant = await tenantAus(req);
  const p = await params;
  const [z, x, y] = [Number(p.z), Number(p.x), Number(p.y.replace(/\.png$/, ""))];
  if (!aktiv(tenant, "karte") || !tenant.karte || !kachelErlaubt(tenant.karte.mitte, z, x, y)) return new Response(null, { status: 404 });
  const datei = path.join(DATA_DIR, "kacheln", String(z), String(x), `${y}.png`);
  try {
    const st = await fs.stat(datei);
    if (Date.now() - st.mtimeMs < TAGE * 86400_000) return bild(await fs.readFile(datei));
  } catch {}
  try {
    const r = await fetch(QUELLE.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)), {
      headers: { "user-agent": `Buergerportal/1.0 (${tenant.email.absenderAdresse})` },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const daten = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(path.dirname(datei), { recursive: true });
    await fs.writeFile(datei, daten);
    return bild(daten);
  } catch {
    return new Response(null, { status: 404 });
  }
}

function bild(d: Buffer) {
  return new Response(new Uint8Array(d), { headers: { "content-type": "image/png", "cache-control": "public, max-age=604800" } });
}
