"use client";

/**
 * Status-Nachrichten zu einem Vorgang bestellen – per SMS, WhatsApp oder E-Mail,
 * auch ohne Bürgerkonto. Die Nachrichten nennen nur Vorgangsnummer und neuen Stand.
 */
import { useId, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { aktiv } from "@/lib/funktionen";
import { deutsch } from "@/lib/i18n";

type K = "sms" | "whatsapp" | "email";
interface Aktiv {
  kanal: K;
  ziel: string;
}

export function StatusAbo({ vorgangId, code, start = [], kompakt }: { vorgangId: string; code?: string; start?: Aktiv[]; kompakt?: boolean }) {
  const { tenant, lang } = useTenant();
  const de = deutsch(lang);
  const id = useId();
  const kanaele: K[] = [...(aktiv(tenant, "sms") ? (["sms"] as const) : []), ...(aktiv(tenant, "whatsapp") ? (["whatsapp"] as const) : []), "email"];
  const [liste, setListe] = useState<Aktiv[]>(start);
  const [offen, setOffen] = useState(false);
  const [kanal, setKanal] = useState<K>(kanaele[0]);
  const [ziel, setZiel] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const NAME: Record<K, string> = { sms: "SMS", whatsapp: "WhatsApp", email: de ? "E-Mail" : "Email" };

  const senden = async (methode: "POST" | "DELETE", body: object) => {
    setLaedt(true);
    setMeldung(null);
    const r = await fetch("/api/anliegen/benachrichtigung", { method: methode, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: vorgangId, code, ...body }) });
    const d = await r.json().catch(() => ({}));
    setLaedt(false);
    if (r.ok) {
      setListe(d.kanaele);
      return true;
    }
    const texte: Record<string, string> = de
      ? { telefon: "Bitte geben Sie eine gültige Mobilnummer ein, z. B. 0151 2345678.", email: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", zu_viele_anfragen: "Bitte versuchen Sie es später noch einmal." }
      : { telefon: "Please enter a valid mobile number.", email: "Please enter a valid email address.", zu_viele_anfragen: "Please try again later." };
    setMeldung({ ok: false, text: texte[d.fehler] ?? (de ? "Das hat nicht geklappt." : "That did not work.") });
    return false;
  };

  const bestellen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await senden("POST", { kanal, ziel })) {
      setOffen(false);
      setZiel("");
      setMeldung({ ok: true, text: de ? `Bestellt. Wir haben Ihnen eine Bestätigung per ${NAME[kanal]} geschickt.` : `Done. We sent you a confirmation via ${NAME[kanal]}.` });
    }
  };

  return (
    <div className={kompakt ? "mt-4" : "rounded-[24px] border border-[var(--line)] p-6 text-left"}>
      {!kompakt && <p className="text-[15px] font-medium">{de ? "Über den Stand informiert werden" : "Get status updates"}</p>}
      {!kompakt && (
        <p className="mt-1 text-[13px] text-subtle">
          {de ? "Wir melden uns, sobald sich etwas tut – ohne Inhalte, nur mit Vorgangsnummer und neuem Stand." : "We let you know when something changes – no content, only the reference number and new status."}
        </p>
      )}
      {liste.length > 0 && (
        <ul className="mt-3 space-y-1">
          {liste.map((k) => (
            <li key={k.kanal} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
              <Icon name={k.kanal === "email" ? "mail" : "phone"} className="size-4 text-muted" />
              <span>
                {NAME[k.kanal]}: <span className="text-muted">{k.ziel}</span>
              </span>
              <button type="button" disabled={laedt} onClick={() => senden("DELETE", { kanal: k.kanal })} className="text-[13px] text-accent underline underline-offset-2">
                {de ? "Abbestellen" : "Unsubscribe"}
                <span className="sr-only"> ({NAME[k.kanal]})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {offen ? (
        <form onSubmit={bestellen} className="mt-3 space-y-3">
          {kanaele.length > 1 && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">{de ? "Kanal" : "Channel"}</legend>
              {kanaele.map((k) => (
                <label key={k} className={`pressable cursor-pointer rounded-full border px-4 py-2 text-[14px] ${kanal === k ? "border-fg font-medium" : "border-[var(--line)] text-muted"}`}>
                  <input type="radio" name={`${id}-k`} value={k} checked={kanal === k} onChange={() => setKanal(k)} className="sr-only" />
                  {NAME[k]}
                </label>
              ))}
            </fieldset>
          )}
          <label htmlFor={`${id}-z`} className="block text-[14px] font-medium">
            {kanal === "email" ? (de ? "E-Mail-Adresse" : "Email address") : de ? "Mobilnummer" : "Mobile number"}
          </label>
          <input
            id={`${id}-z`}
            className="field-input"
            type={kanal === "email" ? "email" : "tel"}
            autoComplete={kanal === "email" ? "email" : "tel"}
            inputMode={kanal === "email" ? "email" : "tel"}
            value={ziel}
            onChange={(e) => setZiel(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={laedt || ziel.trim().length < 5} className="!min-h-10 px-4 text-[14px]">
              {de ? "Bestellen" : "Subscribe"}
            </Button>
            <Button type="button" variant="quiet" className="!min-h-10 px-4 text-[14px]" onClick={() => setOffen(false)}>
              {de ? "Abbrechen" : "Cancel"}
            </Button>
          </div>
        </form>
      ) : (
        liste.length < kanaele.length && (
          <button type="button" onClick={() => setOffen(true)} className="pressable mt-3 inline-flex items-center gap-2 rounded-full text-[14px] font-medium text-accent">
            <Icon name="bell" className="size-4" />
            {kanaele.includes("sms") ? (de ? "Per SMS oder E-Mail benachrichtigen" : "Notify me by text or email") : de ? "Per E-Mail benachrichtigen" : "Notify me by email"}
          </button>
        )
      )}
      <p role={meldung?.ok === false ? "alert" : "status"} className={`mt-2 text-[13px] ${meldung?.ok === false ? "text-danger" : "text-muted"}`}>
        {meldung?.text}
      </p>
    </div>
  );
}
