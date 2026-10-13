import type { MetadataRoute } from "next";
import { untertitel } from "@/lib/i18n";
import { getTenant } from "@/lib/tenant";

/** Web-App-Manifest pro Gemeinde (Name, Farben, Icons). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const tenant = await getTenant();
  return {
    id: `/?app=${tenant.slug}`,
    name: `${tenant.name} – ${untertitel(tenant, tenant.standardSprache)}`,
    short_name: tenant.name,
    description: `Bürgerservice der ${tenant.art} ${tenant.name}`,
    lang: tenant.standardSprache,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f9",
    theme_color: "#f5f7f9",
    categories: ["government", "utilities"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Termin buchen", url: "/termine" },
      { name: "Meine Anliegen", url: "/meine-anliegen" },
    ],
  };
}
