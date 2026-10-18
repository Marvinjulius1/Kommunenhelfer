import { redirect } from "next/navigation";
import { AnmeldeFormular } from "@/components/backoffice/Aktionen";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, demoAktiv } from "@/lib/backoffice/auth";
import { ssoAnbieter } from "@/lib/backoffice/sso";
import { getTenant } from "@/lib/tenant";

const SSO_FEHLER: Record<string, string> = {
  keine_rechte: "Ihr Konto ist für das Backoffice noch nicht freigeschaltet. Bitte wenden Sie sich an die IT.",
  abgelaufen: "Die Anmeldung hat zu lange gedauert. Bitte noch einmal versuchen.",
  abgebrochen: "Die Anmeldung wurde abgebrochen.",
  nicht_erreichbar: "Der Anmeldedienst ist gerade nicht erreichbar.",
  fehler: "Die Anmeldung mit dem Rathaus-Konto hat nicht geklappt.",
};

export default async function Anmelden({ searchParams }: { searchParams: Promise<{ sso?: string }> }) {
  const tenant = await getTenant();
  if (await aktuellerBenutzer(tenant)) redirect("/backoffice");
  const sso = ssoAnbieter(tenant);
  const ssoFehler = SSO_FEHLER[(await searchParams).sso ?? ""];
  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Anmelden</h1>
      <p className="mt-2 text-[15px] text-muted">Backoffice für Mitarbeitende der {tenant.art} {tenant.name}.</p>
      {ssoFehler && (
        <p role="alert" className="mt-6 text-[14px] text-danger">
          {ssoFehler}
        </p>
      )}
      {sso && (
        <>
          <a href="/api/backoffice/sso/start" className="pressable mt-8 flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-medium text-on-accent">
            Mit Rathaus-Konto anmelden ({sso.name})
          </a>
          <p className="mt-6 text-center text-[13px] text-subtle">oder mit Benutzername und Passwort</p>
        </>
      )}
      <Glass className={`${sso ? "mt-3" : "mt-8"} rounded-[24px] p-6`}>
        <AnmeldeFormular />
      </Glass>
      {demoAktiv() && <p className="mt-4 text-[13px] text-subtle">Demo: Benutzer „demo“, Passwort „demo“.</p>}
    </div>
  );
}
