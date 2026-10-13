import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { ServiceWorker } from "@/components/ServiceWorker";
import { TenantProvider } from "@/components/TenantProvider";
import { ThemeScript } from "@/components/ThemeScript";
import { onColor } from "@/lib/color";
import { untertitel } from "@/lib/i18n";
import { getLang, getNonce, getTenant } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const titel = `${tenant.art} ${tenant.name} – ${untertitel(tenant, lang)}`;
  return {
    title: { default: titel, template: `%s · ${tenant.name}` },
    description: `${untertitel(tenant, lang)} der ${tenant.art} ${tenant.name}: Anliegen online erledigen, Termine buchen, Fragen klären.`,
    applicationName: `${tenant.name} Bürgerservice`,
    appleWebApp: { capable: true, title: tenant.name, statusBarStyle: "default" },
    icons: { icon: tenant.wappen, apple: "/pwa-icon/180" },
    formatDetection: { telephone: false },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Die Tastatur auf dem Handy verkleinert den Inhalt, statt das Eingabefeld zu verdecken.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#07090b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const nonce = await getNonce();
  const dunkel = tenant.akzentfarbeDunkel ?? tenant.akzentfarbe;

  // Akzentfarbe der Gemeinde als CSS-Variablen
  const vars = {
    "--accent-light": tenant.akzentfarbe,
    "--on-accent-light": onColor(tenant.akzentfarbe),
    "--accent-dark": dunkel,
    "--on-accent-dark": onColor(dunkel),
  } as React.CSSProperties;

  return (
    <html lang={lang} style={vars} suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <TenantProvider tenant={tenant} lang={lang}>
          <Providers>
            <Header />
            <main id="inhalt" tabIndex={-1} className="flex flex-1 flex-col outline-none">
              {children}
            </main>
            <Footer />
            <ServiceWorker />
          </Providers>
        </TenantProvider>
      </body>
    </html>
  );
}
