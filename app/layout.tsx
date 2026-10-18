import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { ServiceWorker } from "@/components/ServiceWorker";
import { TenantProvider } from "@/components/TenantProvider";
import { ThemeScript } from "@/components/ThemeScript";
import { onColor } from "@/lib/color";
import { fuerBrowser } from "@/lib/config-browser";
import { HTML_LANG, rtl, untertitel } from "@/lib/i18n";
import { getLang, getNonce, getTenant } from "@/lib/tenant";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto, sicht } from "@/lib/konto/service";
import { Warnbanner } from "@/components/Warnbanner";
import { aktuelleLage } from "@/lib/krise/service";
import { aktiveWarnungen } from "@/lib/warnungen/service";
import { vertretungSicht } from "@/lib/konto/vertretung";
import { Vertretungsleiste } from "@/components/konto/Vertretungsleiste";

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
  const kontoRecord = aktiv(tenant, "konto") ? await aktuellesKonto(tenant) : undefined;
  const vertretung = kontoRecord ? await vertretungSicht(tenant) : undefined;
  const konto = kontoRecord ? { ...sicht(kontoRecord), handeltFuer: vertretung } : null;
  const dunkel = tenant.akzentfarbeDunkel ?? tenant.akzentfarbe;
  const lage = await aktuelleLage(tenant).catch(() => undefined);
  const warnungen = [
    // Krisenmodus steht immer vorn und führt zur Lage-Seite
    ...(lage ? [{ id: "krise", stufe: lage.stufe, titel: lage.titel, quelle: "krise" }] : []),
    ...(await aktiveWarnungen(tenant, kontoRecord?.einstellungen.ortsteil).catch(() => [])).map(({ id, stufe, titel, quelle }) => ({ id, stufe, titel, quelle })),
  ];

  // Akzentfarbe der Gemeinde als CSS-Variablen
  const vars = {
    "--accent-light": tenant.akzentfarbe,
    "--on-accent-light": onColor(tenant.akzentfarbe),
    "--accent-dark": dunkel,
    "--on-accent-dark": onColor(dunkel),
  } as React.CSSProperties;

  return (
    <html lang={HTML_LANG[lang]} dir={rtl(lang) ? "rtl" : "ltr"} style={vars} suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <TenantProvider tenant={fuerBrowser(tenant, lang)} lang={lang} konto={konto}>
          <Providers>
            <Warnbanner warnungen={warnungen} />
            <Vertretungsleiste />
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
