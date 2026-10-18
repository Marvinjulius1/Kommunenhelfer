"use client";

/** Ausweis-Status abfragen und – mit Bürgerkonto – benachrichtigen lassen. */
import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { aktiv } from "@/lib/funktionen";
import { deutsch } from "@/lib/i18n";

type Ergebnis = { status: "unbekannt" | "in_produktion" | "abholbereit" | "abgeholt"; text: string };

export function AusweisStatus() {
  const { lang, konto } = useTenant();
  const de = deutsch(lang);
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
                <OhneKonto nummer={nummer} />
              ))}
          </Glass>
        )}
      </div>
    </div>
  );
}

/** Ohne Konto: per SMS oder E-Mail benachrichtigen lassen */
function OhneKonto({ nummer }: { nummer: string }) {
  const { tenant, lang } = useTenant();
  const de = deutsch(lang);
  const sms = aktiv(tenant, "sms");
  const [kanal, setKanal] = useState<"sms" | "email">(sms ? "sms" : "email");
  const [ziel, setZiel] = useState("");
  const [status, setStatus] = useState<"offen" | "ok" | "fehler">("offen");

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/ausweis-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nummer, kanal, ziel }) });
    setStatus(r.ok ? "ok" : "fehler");
  };

  if (status === "ok")
    return (
      <p role="status" className="mt-5 flex items-center gap-2 text-[15px]">
        <Icon name="check" className="size-4" />
        {de ? "Wir benachrichtigen Sie, sobald er da ist. Danach löschen wir Ihren Kontakt." : "We will notify you when it is ready and then delete your contact."}
      </p>
    );
  return (
    <form onSubmit={senden} className="mt-5 space-y-3 border-t border-[var(--line)] pt-5">
      <p className="text-[15px] font-medium">{de ? "Benachrichtigen, sobald er da ist" : "Notify me when it is ready"}</p>
      {sms && (
        <div className="flex gap-2" role="radiogroup" aria-label={de ? "Kanal" : "Channel"}>
          {(["sms", "email"] as const).map((k) => (
            <label key={k} className={`pressable cursor-pointer rounded-full border px-4 py-2 text-[14px] ${kanal === k ? "border-fg font-medium" : "border-[var(--line)] text-muted"}`}>
              <input type="radio" name="ausweis-kanal" className="sr-only" checked={kanal === k} onChange={() => setKanal(k)} />
              {k === "sms" ? "SMS" : de ? "E-Mail" : "Email"}
            </label>
          ))}
        </div>
      )}
      <label htmlFor="ausweis-ziel" className="block text-[14px] font-medium">
        {kanal === "sms" ? (de ? "Mobilnummer" : "Mobile number") : de ? "E-Mail-Adresse" : "Email address"}
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="ausweis-ziel" className="field-input min-w-0 flex-1" type={kanal === "sms" ? "tel" : "email"} autoComplete={kanal === "sms" ? "tel" : "email"} value={ziel} onChange={(e) => setZiel(e.target.value)} required />
        <Button type="submit" variant="glass">
          <Icon name="bell" className="size-4" />
          {de ? "Benachrichtigen" : "Notify me"}
        </Button>
      </div>
      {status === "fehler" && (
        <p role="alert" className="text-[14px] text-danger">
          {de ? "Bitte prüfen Sie Ihre Eingabe." : "Please check your entry."}
        </p>
      )}
      <p className="text-[13px] text-subtle">
        {de ? "Oder mit Bürgerkonto: " : "Or with an account: "}
        <Link href="/konto/anmelden?weiter=/ausweis-status" className="font-medium text-accent underline underline-offset-4">
          {de ? "Anmelden" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
