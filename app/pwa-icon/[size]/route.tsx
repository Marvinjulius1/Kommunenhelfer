/**
 * App-Icons pro Gemeinde, erzeugt aus dem Wappen.
 * /pwa-icon/192, /pwa-icon/512, /pwa-icon/512?maskable=1, /pwa-icon/180 (Apple)
 */
import { ImageResponse } from "next/og";
import { promises as fs } from "node:fs";
import path from "node:path";
import { tenantAus } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Math.min(Math.max(Number((await params).size) || 512, 48), 1024);
  const maskable = new URL(req.url).searchParams.has("maskable");
  const tenant = tenantAus(req);

  const datei = path.join(process.cwd(), "public", tenant.wappen.replace(/^\//, ""));
  const daten = await fs.readFile(datei);
  const mime = datei.endsWith(".svg") ? "image/svg+xml" : "image/png";
  const src = `data:${mime};base64,${daten.toString("base64")}`;
  // Maskierbare Icons brauchen eine Sicherheitszone (ca. 20 % Rand).
  const wappenHoehe = Math.round(size * (maskable ? 0.52 : 0.66));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #ffffff 0%, #eeeef1 100%)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={src} height={wappenHoehe} width={Math.round(wappenHoehe * (120 / 140))} />
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
