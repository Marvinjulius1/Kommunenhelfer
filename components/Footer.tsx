"use client";

/** Leise Fußzeile: rechtliche Links, Kontakt und Sprache – klein, aber mit ausreichendem Kontrast (≥ 4.5:1). */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Sprache } from "@/config/types";
import { deutsch, HTML_LANG, SPRACHEN, SPRACHNAMEN } from "@/lib/i18n";
import { useTenant } from "./TenantProvider";

export function Footer() {
  const { tenant, lang, t } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  if (pathname.startsWith("/backoffice") || pathname.startsWith("/wartezeit/anzeige")) return null;

  const cls = "rounded px-1 py-1 hover:text-fg";
  const sprachen = SPRACHEN.filter((l) => tenant.sprachen.includes(l));
  const spracheWaehlen = (l: Sprache) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8 text-[12px] text-subtle sm:px-6">
      {t.uebersetzungHinweis && <p className="mb-2 text-center">{t.uebersetzungHinweis}</p>}
      <nav aria-label={deutsch(lang) ? "Service und Rechtliches" : "Service and legal"} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Link className={cls} href="/dienste">
          {t.menuDienste}
        </Link>
        <Link className={cls} href="/kontakt">
          {t.menuKontakt}
        </Link>
        <Link className={cls} href="/hilfe">
          {t.menuHilfe}
        </Link>
        <a className={cls} href={tenant.rechtliches.impressumUrl} rel="noopener">
          {t.impressum}
        </a>
        <Link className={cls} href="/datenschutz">
          {t.datenschutz}
        </Link>
        <Link className={cls} href="/barrierefreiheit">
          {t.barrierefreiheit}
        </Link>
        {lang !== "ls" && (
          <Link className={cls} href="/leichte-sprache" lang="de">
            Leichte Sprache
          </Link>
        )}
        {sprachen.length > 1 && (
          <label className="inline-flex items-center gap-1 rounded px-1">
            <span className="sr-only">{t.sprache} / Language</span>
            <select
              value={lang}
              onChange={(e) => spracheWaehlen(e.target.value as Sprache)}
              className="cursor-pointer appearance-none bg-transparent py-1 text-[12px] text-subtle hover:text-fg"
              aria-label={`${t.sprache} / Language`}
            >
              {sprachen.map((l) => (
                <option key={l} value={l} lang={HTML_LANG[l]}>
                  {SPRACHNAMEN[l]}
                </option>
              ))}
            </select>
          </label>
        )}
      </nav>
    </footer>
  );
}
