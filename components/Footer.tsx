import Link from "next/link";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { dict } from "@/lib/i18n";

export function Footer({ tenant, lang }: { tenant: GemeindeConfig; lang: Sprache }) {
  const t = dict(lang);
  const cls = "rounded-md px-1 py-1 hover:text-fg transition-colors";
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-16 text-[13px] text-subtle sm:px-6">
      <nav aria-label="Rechtliches" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>
          © {new Date().getFullYear()} {tenant.art} {tenant.name}
        </span>
        <a className={cls} href={tenant.rechtliches.impressumUrl} rel="noopener">
          {t.impressum}
        </a>
        <Link className={cls} href="/datenschutz">
          {t.datenschutz}
        </Link>
        <Link className={cls} href="/barrierefreiheit">
          {t.barrierefreiheit}
        </Link>
      </nav>
    </footer>
  );
}
