import { redirect } from "next/navigation";
import { AusweisFormular } from "@/components/backoffice/Schalter";
import { Glass } from "@/components/ui/Glass";
import { ausweiseListe } from "@/lib/ausweis/service";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { amtFuer } from "@/lib/backoffice/zugang";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AusweiseBackoffice() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  const darf = darfAmt(b, amtFuer(tenant, "personalausweis").id);
  const liste = darf ? await ausweiseListe(tenant) : [];
  const zahl = (s: string) => liste.filter((a) => a.status === s).length;
  return (
    <div className="max-w-2xl">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Ausweis-Status</h1>
      <p className="mt-1 text-[15px] text-muted">Bürger sehen unter „Ist mein Ausweis da?“ den Stand – mit Konto werden sie benachrichtigt. Antragsnummern werden nur verschlüsselt gespeichert.</p>
      {darf ? (
        <>
          <Glass className="mt-6 rounded-[24px] p-6">
            <AusweisFormular />
          </Glass>
          <p className="mt-6 text-[14px] text-subtle">
            {zahl("in_produktion")} in Herstellung · {zahl("abholbereit")} abholbereit · {zahl("abgeholt")} abgeholt (letzte 30 Tage)
          </p>
        </>
      ) : (
        <p className="mt-6 text-[14px] text-muted">Keine Berechtigung für das Bürgerbüro.</p>
      )}
    </div>
  );
}
