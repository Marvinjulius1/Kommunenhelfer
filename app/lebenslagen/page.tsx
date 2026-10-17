import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { deutsch, tx } from "@/lib/i18n";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Lebenslagen" };

export default async function LebenslagenSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "lebenslagen") || !tenant.lebenslagen?.length) notFound();
  const lang = await getLang(tenant);
  const de = deutsch(lang);
  return (
    <Page titel={de ? "Lebenslagen" : "Life events"} intro={de ? "Alles, was zu tun ist – über alle Ämter hinweg, in der richtigen Reihenfolge und mit Fristen." : "Everything you need to do – across all offices, in the right order, with deadlines."}>
      <ul className="space-y-3">
        {tenant.lebenslagen.map((l) => (
          <li key={l.id}>
            <Link href={`/lebenslagen/${l.id}`} className="block rounded-[24px]">
              <Glass className="pressable flex items-center justify-between gap-4 rounded-[24px] p-6">
                <span>
                  <span className="block text-[17px] font-medium">{tx(l.titel, lang)}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-muted">{tx(l.kurz, lang)}</span>
                  <span className="mt-2 inline-flex items-center gap-2 text-[13px] text-subtle">
                    <Icon name="tasks" className="size-3.5" />
                    {l.schritte.length} {de ? "Schritte" : "steps"}
                  </span>
                </span>
                <Icon name="chevronRight" className="size-4 shrink-0 text-subtle" />
              </Glass>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
