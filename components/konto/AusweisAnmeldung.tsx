"use client";

/**
 * Anmeldung mit dem Online-Ausweis.
 * Im Testmodus wird der Ablauf simuliert (Testidentität). Im Echtbetrieb
 * leitet dieser Schritt zur BundID weiter, die AusweisApp liest den Ausweis.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { sichererPfad } from "./Formularfeld";

export function AusweisAnmeldung({ testmodus }: { testmodus: boolean }) {
  const router = useRouter();
  const weiter = sichererPfad(useSearchParams().get("weiter"));
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const start = async () => {
    setLaedt(true);
    setFehler(null);
    const res = await fetch("/api/konto/ausweis", { method: "POST" });
    setLaedt(false);
    if (!res.ok) {
      setFehler("Die Anmeldung mit dem Online-Ausweis ist gerade nicht möglich. Bitte versuchen Sie es später erneut.");
      return;
    }
    const d = await res.json();
    router.replace(d.emailFehlt ? `/konto/profil?neu=1&weiter=${encodeURIComponent(weiter)}` : weiter);
    router.refresh();
  };

  const schritte = [
    { icon: "id" as const, text: "AusweisApp auf dem Smartphone oder Computer öffnen" },
    { icon: "phone" as const, text: "Personalausweis an die Rückseite des Smartphones halten" },
    { icon: "lock" as const, text: "Ihre sechsstellige PIN eingeben – fertig" },
  ];

  return (
    <div className="space-y-4">
      <Glass className="rounded-[24px] p-6">
        <ol className="space-y-4">
          {schritte.map((s, i) => (
            <li key={i} className="flex items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                <Icon name={s.icon} className="size-5" />
              </span>
              <span className="text-[15px]">
                <span className="sr-only">Schritt {i + 1}: </span>
                {s.text}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[13px] leading-relaxed text-subtle">
          Übermittelt werden nur Name, Geburtsdatum, Anschrift und ein Pseudonym. Ihre PIN bleibt auf Ihrem Gerät.
        </p>
      </Glass>

      {testmodus ? (
        <Glass className="rounded-[24px] p-6">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">
            <Icon name="alert" className="size-4" /> Testmodus
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Dies ist eine Vorführung. Es wird kein echter Ausweis gelesen, sondern eine Testidentität („Erika Mustermann“) verwendet. Im Echtbetrieb erfolgt die Anmeldung über die BundID.
          </p>
          <Button onClick={start} disabled={laedt} className="mt-6 w-full">
            {laedt ? "Ausweis wird geprüft …" : "Mit Testidentität fortfahren"}
          </Button>
        </Glass>
      ) : (
        <Glass className="rounded-[24px] p-6 text-[15px] text-muted">Die Anmeldung mit dem Online-Ausweis wird gerade eingerichtet.</Glass>
      )}
      {fehler && (
        <p role="alert" className="text-[14px] text-danger">
          {fehler}
        </p>
      )}
    </div>
  );
}
