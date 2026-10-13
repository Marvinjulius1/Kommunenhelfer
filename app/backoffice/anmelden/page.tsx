import { redirect } from "next/navigation";
import { AnmeldeFormular } from "@/components/backoffice/Aktionen";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, demoAktiv } from "@/lib/backoffice/auth";
import { getTenant } from "@/lib/tenant";

export default async function Anmelden() {
  const tenant = await getTenant();
  if (await aktuellerBenutzer(tenant)) redirect("/backoffice");
  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Anmelden</h1>
      <p className="mt-2 text-[15px] text-muted">Backoffice für Mitarbeitende der {tenant.art} {tenant.name}.</p>
      <Glass className="mt-8 rounded-[24px] p-6">
        <AnmeldeFormular />
      </Glass>
      {demoAktiv() && <p className="mt-4 text-[13px] text-subtle">Demo: Benutzer „demo“, Passwort „demo“.</p>}
    </div>
  );
}
