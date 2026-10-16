"use client";

/** Anmelden, Registrieren, Passwort vergessen – und der Weg über den Online-Ausweis. */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { aktiv } from "@/lib/funktionen";
import { uebergang } from "@/lib/motion";
import { Eingabe, sichererPfad } from "./Formularfeld";

type Modus = "anmelden" | "registrieren" | "vergessen";

const FEHLER: Record<string, string> = {
  anmeldung: "E-Mail-Adresse oder Passwort stimmen nicht.",
  email_vergeben: "Für diese E-Mail-Adresse gibt es bereits ein Konto. Melden Sie sich an oder setzen Sie Ihr Passwort zurück.",
  passwort_zu_kurz: "Bitte wählen Sie ein Passwort mit mindestens 10 Zeichen. Ein Satz aus mehreren Wörtern ist leicht zu merken und sicher.",
  zu_viele_anfragen: "Zu viele Versuche. Bitte warten Sie ein paar Minuten.",
  ungueltige_anfrage: "Bitte prüfen Sie Ihre Eingaben.",
};

export function Anmeldung() {
  const { tenant } = useTenant();
  const router = useRouter();
  const weiter = sichererPfad(useSearchParams().get("weiter"));
  const [modus, setModus] = useState<Modus>("anmelden");
  const [f, setF] = useState({ vorname: "", nachname: "", email: "", passwort: "", einwilligung: false });
  const [fehler, setFehler] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [testLink, setTestLink] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler(null);
    setInfo(null);
    setLaedt(true);
    try {
      const url = modus === "anmelden" ? "/api/konto/anmelden" : modus === "registrieren" ? "/api/konto/registrieren" : "/api/konto/passwort-vergessen";
      const body = modus === "anmelden" ? { email: f.email, passwort: f.passwort } : modus === "registrieren" ? f : { email: f.email };
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(FEHLER[res.status === 429 ? "zu_viele_anfragen" : d.fehler] ?? "Das hat leider nicht geklappt. Bitte versuchen Sie es erneut.");
      if (modus === "vergessen") {
        setInfo("Wenn es ein Konto mit dieser Adresse gibt, haben wir Ihnen einen Link geschickt.");
        setTestLink(d.testLink ?? null);
        return;
      }
      router.replace(weiter);
      router.refresh();
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  };

  return (
    <div className="space-y-4">
      {aktiv(tenant, "onlineAusweis") && modus !== "vergessen" && (
        <>
          <Glass className="rounded-[24px] p-6">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                <Icon name="id" className="size-5" />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold">Mit dem Online-Ausweis</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">
                  Am sichersten und schnellsten: Ihre Daten werden geprüft übernommen. Damit können Sie auch Leistungen nutzen, für die ein Identitätsnachweis nötig ist.
                </p>
              </div>
            </div>
            <Link href={`/konto/ausweis?weiter=${encodeURIComponent(weiter)}`} className="pressable mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-fg px-6 text-[15px] font-medium text-bg">
              <Icon name="id" className="size-5" />
              Mit Online-Ausweis anmelden
            </Link>
          </Glass>
          <p className="py-2 text-center text-[13px] text-subtle">oder mit E-Mail-Adresse</p>
        </>
      )}

      <Glass className="rounded-[24px] p-6">
        {modus !== "vergessen" && (
          <div role="tablist" aria-label="Anmelden oder registrieren" className="mb-6 grid grid-cols-2 rounded-full bg-[var(--line)] p-1">
            {(["anmelden", "registrieren"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={modus === m}
                onClick={() => {
                  setModus(m);
                  setFehler(null);
                }}
                className={`rounded-full py-2 text-[14px] font-medium ${modus === m ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                {m === "anmelden" ? "Anmelden" : "Konto erstellen"}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.form key={modus} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={uebergang.kurz} onSubmit={senden} className="space-y-4" noValidate>
            {modus === "vergessen" && (
              <div>
                <h2 className="text-[17px] font-semibold">Passwort vergessen</h2>
                <p className="mt-1 text-[14px] text-muted">Wir senden Ihnen einen Link, mit dem Sie ein neues Passwort vergeben.</p>
              </div>
            )}
            {modus === "registrieren" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Eingabe id="k-vorname" label="Vorname" autoComplete="given-name" value={f.vorname} onChange={set("vorname")} required />
                <Eingabe id="k-nachname" label="Nachname" autoComplete="family-name" value={f.nachname} onChange={set("nachname")} required />
              </div>
            )}
            <Eingabe id="k-email" label="E-Mail-Adresse" type="email" autoComplete="email" value={f.email} onChange={set("email")} required />
            {modus !== "vergessen" && (
              <Eingabe
                id="k-passwort"
                label="Passwort"
                type="password"
                autoComplete={modus === "registrieren" ? "new-password" : "current-password"}
                hinweis={modus === "registrieren" ? "Mindestens 10 Zeichen – zum Beispiel ein kurzer Satz." : undefined}
                value={f.passwort}
                onChange={set("passwort")}
                required
              />
            )}
            {modus === "registrieren" && (
              <label className="choice">
                <input type="checkbox" className="checkbox" checked={f.einwilligung} onChange={set("einwilligung")} />
                <span className="text-[14px] leading-relaxed">
                  Ich möchte ein Bürgerkonto bei der {tenant.art} {tenant.name} anlegen. Meine Daten werden verschlüsselt gespeichert und nach 3 Jahren ohne Anmeldung gelöscht.{" "}
                  <Link href="/datenschutz#konto" target="_blank" className="text-accent underline underline-offset-2">
                    Datenschutz
                  </Link>
                </span>
              </label>
            )}
            {fehler && (
              <p role="alert" className="text-[14px] text-danger">
                {fehler}
              </p>
            )}
            {info && (
              <p role="status" className="text-[14px] text-muted">
                {info}{" "}
                {testLink && (
                  <a href={testLink} className="text-accent underline underline-offset-2">
                    Testmodus: Link öffnen
                  </a>
                )}
              </p>
            )}
            <Button type="submit" disabled={laedt || (modus === "registrieren" && !f.einwilligung)} className="w-full">
              {laedt ? "Einen Moment …" : modus === "anmelden" ? "Anmelden" : modus === "registrieren" ? "Konto erstellen" : "Link senden"}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => setModus(modus === "vergessen" ? "anmelden" : "vergessen")} className="rounded px-2 py-1 text-[14px] text-accent">
                {modus === "vergessen" ? "Zurück zur Anmeldung" : "Passwort vergessen?"}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </Glass>
    </div>
  );
}
