"use client";

/** „Das gehört mir“: Erkennungsmerkmale nennen – das Fundbüro meldet sich. */
import { useState } from "react";
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/upload/Sheet";
import { speichereAnliegen } from "@/lib/client/anliegen";

export function Anspruch({ fundId, bezeichnung }: { fundId: string; bezeichnung: string }) {
  const { lang, konto } = useTenant();
  const de = lang === "de";
  const [offen, setOffen] = useState(false);
  const [merkmale, setMerkmale] = useState("");
  const [name, setName] = useState(konto ? `${konto.vorname} ${konto.nachname}` : "");
  const [email, setEmail] = useState(konto?.email ?? "");
  const [telefon, setTelefon] = useState(konto?.telefon ?? "");
  const [ok, setOk] = useState(false);
  const [status, setStatus] = useState<"neu" | "sendet" | "fertig" | "fehler">("neu");

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sendet");
    const r = await fetch("/api/fundbuero/anspruch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fundId, merkmale, kontakt: { name, email, telefon: telefon || undefined }, einwilligung: ok }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setStatus("fehler");
    if (!konto) speichereAnliegen({ id: d.vorgangsnummer, code: d.zugangscode, typ: "antrag", titel: `${de ? "Fundsache" : "Found item"}: ${bezeichnung}`, erstelltAm: new Date().toISOString() });
    setStatus("fertig");
  };

  return (
    <>
      <button type="button" onClick={() => setOffen(true)} className="pressable shrink-0 rounded-full border border-[var(--line)] px-4 py-2 text-[14px] font-medium">
        {de ? "Das gehört mir" : "This is mine"}
      </button>
      <Sheet offen={offen} onClose={() => setOffen(false)} titel={de ? "Fundsache zurückbekommen" : "Claim found item"}>
        {status === "fertig" ? (
          <div>
            <h2 className="text-[19px] font-semibold">{de ? "Danke – wir melden uns." : "Thanks – we will get back to you."}</h2>
            <p className="mt-2 text-[15px] text-muted">
              {de ? "Das Fundbüro prüft Ihre Angaben und meldet sich zur Abholung. Den Stand sehen Sie unter " : "The lost property office will contact you. Track it under "}
              <Link href="/meine-anliegen" className="underline underline-offset-4">
                {de ? "Meine Anliegen" : "My requests"}
              </Link>
              .
            </p>
            <Button className="mt-6 w-full" onClick={() => setOffen(false)}>
              {de ? "Schließen" : "Close"}
            </Button>
          </div>
        ) : (
          <form onSubmit={senden} className="space-y-4">
            <h2 className="text-[19px] font-semibold">{bezeichnung}</h2>
            <label className="block text-[14px] font-medium">
              {de ? "Woran erkennen Sie es?" : "How can you identify it?"}
              <textarea className="field-input mt-1" rows={3} value={merkmale} onChange={(e) => setMerkmale(e.target.value)} required minLength={5} maxLength={1000} placeholder={de ? "z. B. Farbe, Inhalt, Gravur, Sperrbildschirm" : "e.g. colour, contents, engraving"} />
            </label>
            <label className="block text-[14px] font-medium">
              {de ? "Name" : "Name"}
              <input className="field-input mt-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[14px] font-medium">
                {de ? "E-Mail" : "Email"}
                <input className="field-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label className="block text-[14px] font-medium">
                {de ? "Telefon (freiwillig)" : "Phone (optional)"}
                <input className="field-input mt-1" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel" />
              </label>
            </div>
            <label className="flex items-start gap-3 text-[13px] leading-relaxed text-muted">
              <input type="checkbox" className="checkbox mt-0.5" checked={ok} onChange={(e) => setOk(e.target.checked)} required />
              {de ? "Ich bin einverstanden, dass das Fundbüro meine Angaben zur Klärung verarbeitet." : "I agree that the lost property office processes my data."}
            </label>
            {status === "fehler" && (
              <p role="alert" className="text-[14px] text-danger">
                {de ? "Das hat nicht geklappt. Bitte prüfen Sie Ihre Angaben." : "That did not work. Please check your entries."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!ok || status === "sendet"}>
              {status === "sendet" ? (de ? "Wird gesendet …" : "Sending …") : de ? "An das Fundbüro senden" : "Send"}
            </Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
