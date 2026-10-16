import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Page } from "@/components/ui/Page";
import { aktuellesKonto } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";
import { euro, zahlungenVon } from "@/lib/zahlung/service";

export const metadata: Metadata = { title: "Zahlungen" };
export const dynamic = "force-dynamic";

export default async function Zahlungen() {
  const k = await aktuellesKonto(await getTenant());
  if (!k) redirect("/konto/anmelden?weiter=/konto/zahlungen");
  const liste = await zahlungenVon((z) => z.kontoId === k.id);
  const offen = liste.filter((z) => z.status === "offen");
  const bezahlt = liste.filter((z) => z.status === "bezahlt");
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
  return (
    <Page titel="Zahlungen" intro="Offene Gebühren bezahlen Sie hier direkt online. Quittungen stehen dauerhaft bereit.">
      <h2 className="mb-4 text-[17px] font-semibold">Offen</h2>
      {offen.length === 0 ? (
        <p className="text-[15px] text-muted">Keine offenen Zahlungen.</p>
      ) : (
        <ul className="space-y-2">
          {offen.map((z) => (
            <li key={z.id}>
              <Glass className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-6">
                <span>
                  <span className="block text-[20px] font-semibold tabular-nums">{euro(z.betragCent)}</span>
                  <span className="text-[14px] text-muted">{z.zweck}</span>
                </span>
                <Link href={`/bezahlen/${z.id}`} className="pressable inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-[15px] font-medium text-on-accent">
                  Bezahlen
                </Link>
              </Glass>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-4 mt-10 text-[17px] font-semibold">Bezahlt</h2>
      {bezahlt.length === 0 ? (
        <p className="text-[15px] text-muted">Noch keine Zahlungen.</p>
      ) : (
        <ul className="space-y-2">
          {bezahlt.map((z) => (
            <li key={z.id}>
              <Link href={`/bezahlen/${z.id}/quittung`} className="glass pressable flex items-center justify-between gap-4 rounded-[24px] p-6">
                <span>
                  <span className="block text-[16px] font-medium">{z.zweck}</span>
                  <span className="text-[13px] text-subtle">bezahlt am {fmt.format(new Date(z.bezahltAm!))} · Quittung</span>
                </span>
                <span className="text-[16px] font-semibold tabular-nums">{euro(z.betragCent)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
