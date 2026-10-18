import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { findeLeistung, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Friedhöfe" };

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default async function FriedhofSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "friedhof") || !tenant.friedhoefe?.length) notFound();
  const verlaengern = findeLeistung(tenant, "grabnutzung-verlaengern");
  const sterbefall = findeLeistung(tenant, "sterbefall");
  return (
    <Page titel="Friedhöfe" intro="Grabarten, Ruhezeiten und Gebühren auf einen Blick. Das Nutzungsrecht an einer Grabstelle verlängern Sie online.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {verlaengern && (
          <li>
            <Link href={`/antrag/${verlaengern.id}`} className="glass pressable flex h-full items-start gap-4 rounded-[24px] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                <Icon name="refresh" className="size-5" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">{tx(verlaengern.titel, "de")}</span>
                <span className="mt-1 block text-[14px] text-muted">Online, mit direkter Bezahlung</span>
              </span>
            </Link>
          </li>
        )}
        {sterbefall && (
          <li>
            <Link href={sterbefall.online && sterbefall.formular ? `/antrag/${sterbefall.id}` : sterbefall.termin ? `/termine?leistung=${sterbefall.id}` : "/kontakt"} className="glass pressable flex h-full items-start gap-4 rounded-[24px] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                <Icon name="heart" className="size-5" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">Ein Mensch ist gestorben</span>
                <span className="mt-1 block text-[14px] text-muted">{tx(sterbefall.kurz, "de")}</span>
              </span>
            </Link>
          </li>
        )}
      </ul>
      {tenant.friedhoefe.map((f) => (
        <section key={f.id} className="mt-10">
          <h2 className="text-[20px] font-semibold tracking-tight">{f.name}</h2>
          <p className="mt-1 text-[14px] text-muted">
            {f.adresse}
            {f.oeffnungszeiten ? ` · ${f.oeffnungszeiten}` : ""}
          </p>
          <Glass className="mt-4 overflow-x-auto rounded-[24px] p-2">
            <table className="w-full min-w-[30rem] text-[14px]">
              <caption className="sr-only">Grabarten auf dem {f.name}</caption>
              <thead>
                <tr className="text-left text-[12px] text-subtle">
                  <th scope="col" className="px-4 py-2 font-medium">Grabart</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Ruhezeit</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Gebühr</th>
                </tr>
              </thead>
              <tbody>
                {f.grabarten.map((g) => (
                  <tr key={g.name} className="border-t border-[var(--line)]">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      {g.name}
                      {g.hinweis && <span className="block text-[12px] text-subtle">{g.hinweis}</span>}
                    </th>
                    <td className="px-4 py-3 text-right tabular-nums">{g.ruhezeitJahre} Jahre</td>
                    <td className="px-4 py-3 text-right tabular-nums">{g.gebuehrEuro !== undefined ? euro(g.gebuehrEuro) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Glass>
        </section>
      ))}
      <p className="mt-8 text-[13px] text-subtle">Gebühren laut Friedhofsgebührensatzung. Verbindlich ist der Gebührenbescheid.</p>
    </Page>
  );
}
