"use client";

/** Ausweis-Status abfragen und – mit Bürgerkonto – benachrichtigen lassen. */
import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

type Ergebnis = { status: "unbekannt" | "in_produktion" | "abholbereit" | "abgeholt"; text: string };

export function AusweisStatus() {
  const { lang, konto } = useTenant();
  const de = lang === "de";
  const [nummer, setNummer] = useState("");
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [vorgemerkt, setVorgemerkt] = useState(false);

  const pruefen = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler(null);
    setVorgemerkt(false);
    const r = await fetch(`/api/ausweis-status?nummer=${encodeURIComponent(nummer)}`);
    const d = await r.json().catch(() => ({}));
    if (r.status === 429) return setFehler(de ? "Zu viele Abfragen. Bitte versuchen Sie es später erneut." : "Too many requests. Please try again later.");
    if (!r.ok) return setFehler(de ? "Bitte prüfen Sie die Nummer (9 bis 14 Zeichen)." : "Please check the number (9 to 14 characters).");
    setErgebnis(d);
  };

  const vormerken = async () => {
    const r = await fetch("/api/ausweis-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nummer }) });
    if (r.ok) setVorgemerkt(true);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={pruefen} className="space-y-3">
        <label htmlFor="ausweis-nr" className="block text-[14px] font-medium">
          {de ? "Antragsnummer" : "Application number"}
        </label>
        <p id="ausweis-nr-hinweis" className="text-[13px] text-subtle">
          {de ? "Sie steht auf dem Beleg, den Sie bei der Beantragung bekommen haben." : "It is on the receipt you received when applying."}
        </p>
        <div className="flex gap-2">
          <input
            id="ausweis-nr"
            aria-describedby="ausweis-nr-hinweis"
            className="field-input flex-1 font-mono tracking-wider"
            value={nummer}
            onChange={(e) => setNummer(e.target.value.toUpperCase())}
            inputMode="text"
            autoComplete="off"
            maxLength={20}
            required
          />
          <Button type="submit" className="px-6">
            {de ? "Prüfen" : "Check"}
          </Button>
        </div>
      </form>
      {fehler && (
        <p role="alert" className="text-[15px] text-danger">
          {fehler}
        </p>
      )}
      <div aria-live="polite">
        {ergebnis && (
          <Glass className="rounded-[24px] p-6">
            <p className="flex items-center gap-3 text-[19px] font-semibold">
              <span className={`grid size-9 place-items-center rounded-full ${ergebnis.status === "abholbereit" ? "bg-accent text-on-accent" : "bg-[var(--line)]"}`} aria-hidden="true">
                <Icon name={ergebnis.status === "abholbereit" ? "check" : "clock"} className="size-4" />
              </span>
              {ergebnis.text}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {ergebnis.status === "abholbereit"
                ? de
                  ? "Sie können Ihr Dokument zu den Öffnungszeiten ohne Termin abholen. Bringen Sie bitte das alte Dokument mit."
                  : "You can collect it during opening hours without an appointment. Please bring your old document."
                : ergebnis.status === "abgeholt"
                  ? de
                    ? "Dieses Dokument wurde bereits abgeholt."
                    : "This document has already been collected."
                  : de
                    ? "Die Herstellung dauert in der Regel drei bis vier Wochen."
                    : "Production usually takes three to four weeks."}
            </p>
            {(ergebnis.status === "unbekannt" || ergebnis.status === "in_produktion") &&
              (konto ? (
                <Button variant="glass" className="mt-5" onClick={vormerken} disabled={vorgemerkt}>
                  <Icon name="bell" className="size-4" />
                  {vorgemerkt ? (de ? "Wir benachrichtigen Sie" : "We will notify you") : de ? "Benachrichtigen, sobald er da ist" : "Notify me when ready"}
                </Button>
              ) : (
                <p className="mt-5 text-[14px] text-muted">
                  {de ? "Mit einem Bürgerkonto benachrichtigen wir Sie, sobald er da ist. " : "With an account we notify you when it is ready. "}
                  <Link href="/konto/anmelden?weiter=/ausweis-status" className="font-medium text-accent underline underline-offset-4">
                    {de ? "Anmelden" : "Sign in"}
                  </Link>
                </p>
              ))}
          </Glass>
        )}
      </div>
    </div>
  );
}
