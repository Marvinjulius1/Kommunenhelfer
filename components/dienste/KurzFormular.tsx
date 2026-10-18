"use client";

/**
 * Kurzes Formular für Anmeldungen und Nachrichten (Veranstaltung, Ehrenamt, Verein).
 * Mit Bürgerkonto sind Name und E-Mail vorausgefüllt.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";

type Extra = "telefon" | "anzahl" | "text" | "hinweis";

export function KurzFormular({
  endpoint,
  basis,
  felder,
  textLabel = "Ihre Nachricht",
  knopf,
  erfolg,
  erfolgWarteliste,
  maxAnzahl = 6,
  zweck,
}: {
  endpoint: string;
  basis: Record<string, unknown>;
  felder: Extra[];
  textLabel?: string;
  knopf: string;
  erfolg: string;
  /** Meldung, wenn der Server „warteliste“ zurückgibt */
  erfolgWarteliste?: string;
  maxAnzahl?: number;
  /** Wofür die Daten verwendet werden (Datenschutzhinweis) */
  zweck: string;
}) {
  const { konto } = useTenant();
  const id = useId();
  const [w, setW] = useState({ name: konto ? `${konto.vorname} ${konto.nachname}`.trim() : "", email: konto?.email ?? "", telefon: "", anzahl: 1, text: "", hinweis: "", einwilligung: false });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [laedt, setLaedt] = useState(false);

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaedt(true);
    setStatus(null);
    const body = {
      ...basis,
      name: w.name,
      email: w.email,
      einwilligung: w.einwilligung,
      ...(felder.includes("telefon") && w.telefon ? { telefon: w.telefon } : {}),
      ...(felder.includes("anzahl") ? { anzahl: w.anzahl } : {}),
      ...(felder.includes("text") ? { text: w.text } : {}),
      ...(felder.includes("hinweis") && w.hinweis ? { hinweis: w.hinweis } : {}),
    };
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setLaedt(false);
    if (r.ok) setStatus({ ok: true, text: d.status === "warteliste" && erfolgWarteliste ? erfolgWarteliste : erfolg });
    else setStatus({ ok: false, text: r.status === 429 ? "Zu viele Anfragen. Bitte versuchen Sie es später erneut." : "Bitte prüfen Sie Ihre Angaben." });
  };

  if (status?.ok)
    return (
      <p role="status" className="rounded-[18px] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-4 text-[15px]">
        {status.text}
      </p>
    );

  return (
    <form onSubmit={senden} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[14px] font-medium">
          Name
          <input className="field-input mt-1" required minLength={2} maxLength={120} autoComplete="name" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} />
        </label>
        <label className="block text-[14px] font-medium">
          E-Mail-Adresse
          <input className="field-input mt-1" type="email" required autoComplete="email" value={w.email} onChange={(e) => setW({ ...w, email: e.target.value })} />
        </label>
        {felder.includes("telefon") && (
          <label className="block text-[14px] font-medium">
            Telefon (freiwillig)
            <input className="field-input mt-1" type="tel" autoComplete="tel" value={w.telefon} onChange={(e) => setW({ ...w, telefon: e.target.value })} />
          </label>
        )}
        {felder.includes("anzahl") && (
          <label className="block text-[14px] font-medium">
            Personen
            <select className="field-input mt-1" value={w.anzahl} onChange={(e) => setW({ ...w, anzahl: Number(e.target.value) })}>
              {Array.from({ length: maxAnzahl }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {felder.includes("text") && (
        <label className="block text-[14px] font-medium">
          {textLabel}
          <textarea className="field-input mt-1" rows={3} required minLength={5} maxLength={1500} value={w.text} onChange={(e) => setW({ ...w, text: e.target.value })} />
        </label>
      )}
      {felder.includes("hinweis") && (
        <label className="block text-[14px] font-medium">
          Hinweis (freiwillig, z. B. Alter des Kindes, Allergien)
          <textarea className="field-input mt-1" rows={2} maxLength={500} value={w.hinweis} onChange={(e) => setW({ ...w, hinweis: e.target.value })} />
        </label>
      )}
      <label htmlFor={`${id}-ok`} className="flex items-start gap-3 text-[14px] text-muted">
        <input id={`${id}-ok`} type="checkbox" className="checkbox mt-0.5" checked={w.einwilligung} onChange={(e) => setW({ ...w, einwilligung: e.target.checked })} required />
        <span>
          Ich bin einverstanden, dass meine Angaben {zweck} verwendet werden.{" "}
          <Link href="/datenschutz" target="_blank" className="text-accent underline underline-offset-2">
            Datenschutz
          </Link>
        </span>
      </label>
      <Button type="submit" disabled={laedt || !w.einwilligung}>
        {laedt ? "Wird gesendet …" : knopf}
      </Button>
      {status && !status.ok && (
        <p role="alert" className="text-[14px] text-danger">
          {status.text}
        </p>
      )}
    </form>
  );
}
