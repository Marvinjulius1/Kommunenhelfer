import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";

/** Ruhige Kachel im Konto-Dashboard. */
export function Kachel({ href, icon, titel, text, zahl }: { href: string; icon: IconName; titel: string; text?: string; zahl?: number }) {
  return (
    <Link href={href} className="glass pressable flex items-start gap-4 rounded-[24px] p-6">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
        <Icon name={icon} className="size-5" />
        {!!zahl && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-fg px-1 text-[11px] font-semibold text-bg" aria-hidden="true">
            {zahl}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold">{titel}</span>
        {text && <span className="mt-1 block text-[14px] leading-snug text-muted">{text}</span>}
        {!!zahl && <span className="sr-only"> – {zahl} neu</span>}
      </span>
    </Link>
  );
}
