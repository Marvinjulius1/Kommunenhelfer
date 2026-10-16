import { redirect } from "next/navigation";
import { FundFormular, FundStatus } from "@/components/backoffice/Schalter";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { amtFuer } from "@/lib/backoffice/zugang";
import { alleFunde, FUND_KATEGORIEN } from "@/lib/fundbuero/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function FundbueroBackoffice() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!darfAmt(b, amtFuer(tenant, "fundsache").id)) return <p className="text-[14px] text-muted">Keine Berechtigung für das Fundbüro.</p>;
  const liste = await alleFunde(tenant);
  const fmt = (d: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Fundbüro</h1>
        <p className="mt-1 text-[15px] text-muted">Erfasste Fundsachen erscheinen sofort in der öffentlichen Suche. Ansprüche kommen als Vorgang ins Bürgerbüro.</p>
        <Glass className="mt-6 rounded-[24px] p-6">
          <FundFormular kategorien={FUND_KATEGORIEN} />
        </Glass>
      </div>
      <ul className="space-y-3 lg:pt-14">
        {liste.length === 0 && <li className="text-[14px] text-muted">Noch nichts erfasst.</li>}
        {liste.map((f) => (
          <li key={f.id}>
            <Glass className={`flex items-start justify-between gap-4 rounded-[20px] p-5 ${f.status === "abgeholt" ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{f.bezeichnung}</p>
                <p className="mt-1 text-[13px] text-subtle">
                  {f.kategorie} · {f.fundort} · {fmt(f.funddatum)} · {f.erfasstVon}
                  {f.status === "abgeholt" ? " · abgeholt" : ""}
                </p>
              </div>
              <FundStatus id={f.id} status={f.status} />
            </Glass>
          </li>
        ))}
      </ul>
    </div>
  );
}
