"use client";

/** Leise Fußzeile: rechtliche Links, Kontakt und Sprache – klein, aber mit ausreichendem Kontrast (≥ 4.5:1). */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Sprache } from "@/config/types";
import { useTenant } from "./TenantProvider";

const SPRACHNAMEN: Record<Sprache, string> = { de: "Deutsch", en: "English" };

export function Footer() {
  const { tenant, lang, t } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  if (pathname.startsWith("/backoffice")) return null;

  const cls = "rounded px-1 py-1 hover:text-fg";
  const andere = tenant.sprachen.filter((l) => l !== lang);
  const spracheWaehlen = (l: Sprache) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8 text-[12px] text-subtle sm:px-6">
      <nav aria-label={lang === "de" ? "Service und Rechtliches" : "Service and legal"} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
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
        {andere.map((l) => (
          <button key={l} type="button" lang={l} className={cls} onClick={() => spracheWaehlen(l)}>
            {SPRACHNAMEN[l]}
          </button>
        ))}
      </nav>
    </footer>
  );
}
