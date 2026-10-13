"use client";

/**
 * Zusammenfassung vor dem Absenden hochgeladener Unterlagen:
 * Vorgang, zuständiges Amt, Unterlagen (Art prüfbar), fehlende Unterlagen,
 * Kontaktdaten – und erst nach ausdrücklicher Bestätigung: Absenden.
 */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Einreichung as EinreichungDaten } from "@/lib/assistant/types";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { speichereAnliegen } from "@/lib/client/anliegen";
import { entwurfId } from "@/lib/client/uploads";
import { tx } from "@/lib/i18n";
import { einblenden, gestaffelt, uebergang } from "@/lib/motion";
import { dokumentarten } from "@/lib/uploads/dokumentarten";
import { formatGroesse } from "@/lib/uploads/formate";
import { artLabel, einreichbareLeistungen, fehlendeUnterlagen, zustaendigesAmt } from "@/lib/uploads/pruefung";
import { Vorschau } from "./AttachmentTray";

export interface EinreichungErgebnis {
  vorgangsnummer: string;
  amt: string;
  bearbeitungshinweis?: string;
  email: string;
}

interface Props {
  daten: EinreichungDaten;
  vorschauen: Record<string, string | undefined>;
  nachricht: string;
  aktiv: boolean;
  /** Bereits abgesendet (z. B. nach Neuladen der Seite) */
  ergebnis?: EinreichungErgebnis;
  onAbgesendet: (e: EinreichungErgebnis) => void;
}

export function Einreichung({ daten, vorschauen, nachricht: start, aktiv, ergebnis, onAbgesendet }: Props) {
  const { tenant, lang, t } = useTenant();
  const de = lang === "de";
  const [leistungId, setLeistungId] = useState(daten.leistungId ?? "");
  const [amtWahl, setAmtWahl] = useState(daten.amtId);
  const [arten, setArten] = useState<Record<string, string>>(Object.fromEntries(daten.dokumente.map((d) => [d.id, d.art])));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [nachricht, setNachricht] = useState(start);
  const [bestaetigt, setBestaetigt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);

  const leistungen = useMemo(() => einreichbareLeistungen(tenant), [tenant]);
  const amt = zustaendigesAmt(tenant, leistungId || undefined, amtWahl);
  const fehlend = fehlendeUnterlagen(tenant, leistungId || undefined, Object.values(arten));
  const id = (x: string) => `einr-${daten.dokumente[0]?.id.slice(0, 6)}-${x}`;

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setFehler(de ? "Bitte geben Sie Ihren Namen und eine gültige E-Mail-Adresse an." : "Please enter your name and a valid email address.");
      return;
    }
    if (!bestaetigt) {
      setFehler(de ? "Bitte bestätigen Sie, dass wir die Unterlagen an das Amt senden dürfen." : "Please confirm that we may send the documents to the office.");
      return;
    }
    setFehler(null);
    setSendet(true);
    try {
      const res = await fetch("/api/vorgang", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entwurf: entwurfId(),
          dokumente: daten.dokumente.map((d) => ({ id: d.id, art: arten[d.id] })),
          leistungId: leistungId || undefined,
          amtId: amt.id,
          kontakt: { name: name.trim(), email: email.trim(), telefon: telefon.trim() || undefined },
          nachricht: nachricht.trim() || undefined,
          bestaetigt: true,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) throw new Error(de ? "Einige Unterlagen sind nicht mehr verfügbar (nach 24 Stunden gelöscht). Bitte laden Sie sie erneut hoch." : "Some documents are no longer available. Please upload them again.");
      if (!res.ok) throw new Error(res.status === 429 ? t.zuVieleAnfragen : t.fehlerAllgemein);
      const l = tenant.leistungen.find((x) => x.id === leistungId);
      speichereAnliegen({ id: d.vorgangsnummer, code: d.zugangscode, typ: "antrag", titel: l ? tx(l.titel, lang) : de ? "Eingereichte Unterlagen" : "Submitted documents", erstelltAm: new Date().toISOString() });
      entwurfId(true); // neuer Entwurf für das nächste Anliegen
      onAbgesendet({ vorgangsnummer: d.vorgangsnummer, amt: d.amt, bearbeitungshinweis: d.bearbeitungshinweis, email: email.trim() });
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setSendet(false);
    }
  };

  if (ergebnis) {
    return (
      <motion.div variants={gestaffelt(0.06)} initial="hidden" animate="show">
        <Glass className="rounded-[24px] p-6">
          <motion.div variants={einblenden} className="flex items-center gap-4">
            <span className="grid size-10 place-items-center rounded-full bg-accent text-on-accent">
              <Icon name="check" className="size-5" />
            </span>
            <h2 className="text-[17px] font-semibold">{de ? "Ihre Unterlagen sind eingegangen." : "Your documents have been received."}</h2>
          </motion.div>
          <motion.dl variants={einblenden} className="mt-6 grid gap-4 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-[13px] text-subtle">{de ? "Vorgangsnummer" : "Reference number"}</dt>
              <dd className="mt-1 font-mono text-[17px] tracking-wide">{ergebnis.vorgangsnummer}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-subtle">{de ? "Weitergeleitet an" : "Forwarded to"}</dt>
              <dd className="mt-1">{ergebnis.amt}</dd>
            </div>
          </motion.dl>
          <motion.p variants={einblenden} className="mt-4 text-[15px] leading-relaxed text-muted">
            {ergebnis.bearbeitungshinweis ? `${ergebnis.bearbeitungshinweis} ` : ""}
            {de ? `Eine Bestätigung haben wir an ${ergebnis.email} gesendet.` : `We have sent a confirmation to ${ergebnis.email}.`}
          </motion.p>
          <motion.div variants={einblenden} className="mt-6">
            <Link href="/meine-anliegen" className="text-[15px] font-medium text-accent underline-offset-4 hover:underline">
              {t.menuAnliegen}
            </Link>
          </motion.div>
        </Glass>
      </motion.div>
    );
  }

  return (
    <Glass className="rounded-[24px] p-6">
      <form onSubmit={absenden} noValidate aria-labelledby={id("titel")}>
        <h2 id={id("titel")} className="text-[17px] font-semibold">
          {de ? "Zusammenfassung" : "Summary"}
        </h2>

        {/* Vorgang & Amt */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={id("vorgang")} className="text-[13px] text-subtle">
              {de ? "Vorgang" : "Request"}
            </label>
            <select id={id("vorgang")} className="field-input mt-1" value={leistungId} onChange={(e) => setLeistungId(e.target.value)} disabled={!aktiv}>
              <option value="">{de ? "Sonstiges Anliegen / weiß ich nicht" : "Other / not sure"}</option>
              {leistungen.map((l) => (
                <option key={l.id} value={l.id}>
                  {tx(l.titel, lang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            {leistungId ? (
              <>
                <p className="text-[13px] text-subtle">{de ? "Zuständig" : "Responsible"}</p>
                <p className="mt-1 flex min-h-12 items-center text-[15px]">{tx(amt.name, lang)}</p>
              </>
            ) : (
              <>
                <label htmlFor={id("amt")} className="text-[13px] text-subtle">
                  {de ? "Zuständig (Vorschlag)" : "Responsible (suggestion)"}
                </label>
                <select id={id("amt")} className="field-input mt-1" value={amtWahl} onChange={(e) => setAmtWahl(e.target.value)} disabled={!aktiv}>
                  {tenant.aemter.map((a) => (
                    <option key={a.id} value={a.id}>
                      {tx(a.name, lang)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        {amt.bearbeitungshinweis && <p className="mt-2 text-[13px] text-subtle">{tx(amt.bearbeitungshinweis, lang)}</p>}

        {/* Unterlagen */}
        <h3 className="mt-8 text-[13px] text-subtle">{de ? "Unterlagen" : "Documents"}</h3>
        <ul className="mt-2 space-y-2">
          {daten.dokumente.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] bg-[var(--line)] p-2 sm:flex-nowrap sm:pr-4">
              <Vorschau src={vorschauen[d.id]} typ={d.typ} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{d.name}</p>
                <p className="text-[12px] text-subtle">
                  {formatGroesse(d.groesse, lang)}
                  {d.seiten ? ` · ${d.seiten} ${de ? (d.seiten === 1 ? "Seite" : "Seiten") : "page(s)"}` : ""}
                </p>
              </div>
              <label className="sr-only" htmlFor={id(`art-${d.id}`)}>
                {de ? `Art von ${d.name}` : `Type of ${d.name}`}
              </label>
              <select
                id={id(`art-${d.id}`)}
                value={arten[d.id]}
                onChange={(e) => setArten((a) => ({ ...a, [d.id]: e.target.value }))}
                disabled={!aktiv}
                className={`field-input !min-h-10 w-full shrink-0 !py-2 text-[14px] sm:w-48 ${!d.artSicher && arten[d.id] === d.art ? "!border-[var(--fg-subtle)]" : ""}`}
              >
                {dokumentarten(tenant).map((a) => (
                  <option key={a.id} value={a.id}>
                    {tx(a.label, lang)}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>

        <AnimatePresence initial={false}>
          {fehlend.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={uebergang.mittel} className="mt-4 flex gap-2 text-[14px] text-muted" role="status">
              <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
              <p>
                {de ? "Es fehlt noch: " : "Still missing: "}
                {fehlend.map((f) => artLabel(tenant, f.art, lang)).join(", ")}.{" "}
                {de ? "Sie können die Unterlagen im Eingabefeld ergänzen oder trotzdem absenden." : "You can add them in the input field or send anyway."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kontakt */}
        <h3 className="mt-8 text-[13px] text-subtle">{de ? "Ihre Kontaktdaten" : "Your contact details"}</h3>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={id("name")} className="text-[14px] font-medium">
              {de ? "Vor- und Nachname" : "Full name"}
            </label>
            <input id={id("name")} className="field-input mt-1" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required disabled={!aktiv} />
          </div>
          <div>
            <label htmlFor={id("email")} className="text-[14px] font-medium">
              {de ? "E-Mail-Adresse" : "Email address"}
            </label>
            <input id={id("email")} type="email" className="field-input mt-1" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required disabled={!aktiv} />
          </div>
          <div>
            <label htmlFor={id("tel")} className="text-[14px] font-medium">
              {de ? "Telefon (freiwillig)" : "Phone (optional)"}
            </label>
            <input id={id("tel")} type="tel" className="field-input mt-1" autoComplete="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} maxLength={40} disabled={!aktiv} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id("nachricht")} className="text-[14px] font-medium">
              {de ? "Nachricht an das Amt (freiwillig)" : "Message to the office (optional)"}
            </label>
            <textarea id={id("nachricht")} rows={2} className="field-input mt-1" value={nachricht} onChange={(e) => setNachricht(e.target.value)} maxLength={2000} disabled={!aktiv} />
          </div>
        </div>

        <label className="choice mt-6">
          <input type="checkbox" className="checkbox" checked={bestaetigt} onChange={(e) => setBestaetigt(e.target.checked)} disabled={!aktiv} aria-required="true" />
          <span className="text-[14px] leading-relaxed">
            {de
              ? `Ich möchte die Unterlagen verbindlich an „${tx(amt.name, lang)}“ senden. Mir ist bewusst, dass ein KI-System sie nur vorsortiert hat und das Amt über mein Anliegen entscheidet.`
              : `I want to send the documents to "${tx(amt.name, lang)}". I understand that an AI system only pre-sorted them and the office decides on my request.`}
          </span>
        </label>

        {fehler && (
          <p role="alert" className="mt-4 text-[14px] text-danger">
            {fehler}
          </p>
        )}

        <div className="mt-6">
          <Button type="submit" disabled={sendet || !aktiv} aria-busy={sendet} className="w-full sm:w-auto">
            {sendet ? (de ? "Wird gesendet …" : "Sending …") : de ? "Verbindlich absenden" : "Submit"}
          </Button>
        </div>
      </form>
    </Glass>
  );
}
