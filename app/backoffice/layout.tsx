import type { Metadata } from "next";
import Link from "next/link";
import { AbmeldenButton } from "@/components/backoffice/Aktionen";
import { ThemeToggle } from "@/components/ThemeToggle";
import { aktuellerBenutzer } from "@/lib/backoffice/auth";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Backoffice", robots: { index: false, follow: false } };

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/backoffice" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tenant.wappen} alt="" width={120} height={140} className="h-8 w-auto" />
            <span className="hidden text-[15px] font-medium sm:inline">{tenant.name}</span>
            <span className="hidden text-[15px] text-subtle md:inline">· Backoffice</span>
          </Link>
          <div className="flex items-center gap-2 text-[14px] text-muted">
            {b && (
              <nav aria-label="Backoffice" className="flex items-center sm:mr-2 sm:gap-1">
                <Link href="/backoffice" className="rounded-full px-2 py-1 hover:text-fg sm:px-3">
                  Vorgänge
                </Link>
                <Link href="/backoffice/meldungen" className="rounded-full px-2 py-1 hover:text-fg sm:px-3">
                  Meldungen
                </Link>
              </nav>
            )}
            {b && <span className="hidden sm:inline">{b.name}</span>}
            {b && <AbmeldenButton />}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {b?.demo && (
        <p className="bg-[var(--line)] px-4 py-2 text-center text-[13px] text-muted">
          Demo-Zugang aktiv. Nur für Vorführungen mit Testdaten – in Produktion BACKOFFICE_DEMO entfernen.
        </p>
      )}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
