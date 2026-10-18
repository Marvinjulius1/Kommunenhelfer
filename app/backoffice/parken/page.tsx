import Link from "next/link";
import { redirect } from "next/navigation";
import { VerwarnungFormular } from "@/components/backoffice/VerwarnungFormular";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { amtFuer } from "@/lib/backoffice/zugang";
import { liste } from "@/lib/parken/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const STATUS = { offen: "offen", bezahlt: "bezahlt", stellungnahme: "Stellungnahme" };

export default async function ParkenBackoffice() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!darfAmt(b, amtFuer(tenant, "parken").id)) return <p className="text-[14px] text-muted">Verwarnungsgelder bearbeitet das Ordnungsamt.</p>;
  const faelle = await liste(tenant);
  const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <section>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Verwarnungsgeld</h1>
        <p className="mt-1 text-[15px] text-muted">Kennzeichen werden nur als Prüfwert gespeichert und sind hier nicht mehr lesbar.</p>
        <Glass className="mt-6 rounded-[24px] p-6">
          <VerwarnungFormular />
        </Glass>
      </section>
      <section>
        <h2 className="text-[17px] font-semibold">
          {faelle.length} Fälle · {faelle.filter((f) => f.status === "bezahlt").length} online bezahlt
        </h2>
        <ul className="mt-4 space-y-2">
          {faelle.map((f) => (
            <li key={f.id}>
              <Glass className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-5 py-3 text-[14px]">
                <span>
                  <span className="font-mono">{f.aktenzeichen}</span>
                  <span className="block text-[12px] text-subtle">
                    {f.tatbestand} · {f.tatort}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{euro(f.betragCent)}</span>
                  {f.vorgangId ? (
                    <Link href={`/backoffice/vorgang/${f.vorgangId}`} className="rounded-full bg-fg px-3 py-1 text-[12px] text-bg">
                      {STATUS[f.status]}
                    </Link>
                  ) : (
                    <span className={`rounded-full px-3 py-1 text-[12px] ${f.status === "bezahlt" ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success" : "bg-[var(--line)]"}`}>{STATUS[f.status]}</span>
                  )}
                </span>
              </Glass>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
