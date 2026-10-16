"use client";

/**
 * Terminbuchung: Anliegen → Tag & Uhrzeit → Kontaktdaten → Bestätigung.
 */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { aktiv } from "@/lib/funktionen";
import type { Amt, Leistung } from "@/config/types";
import { useTenant } from "@/components/TenantProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { speichereAnliegen } from "@/lib/client/anliegen";
import { einblenden, feder, gestaffelt } from "@/lib/motion";
import { tx } from "@/lib/i18n";
import { Calendar } from "./Calendar";

interface Slot {
  id: string;
  datum: string;
  zeit: string;
  frei: number;
}

interface Auswahl {
  amt: Amt;
  leistung?: Leistung;
}

export function Booking({ vorauswahl }: { vorauswahl?: string }) {
  const { tenant, lang, t, konto } = useTenant();
  const de = lang === "de";

  const gruppen = useMemo(
    () =>
      tenant.aemter.filter((amt) => amt.termine).map((amt) => ({
        amt,
        leistungen: tenant.leistungen.filter((l) => l.aktiv && l.termin && l.amtId === amt.id),
      })),
    [tenant],
  );

  const start = useMemo<Auswahl | null>(() => {
    const l = tenant.leistungen.find((x) => x.id === vorauswahl && x.aktiv && x.termin);
    const amt = l && tenant.aemter.find((a) => a.id === l.amtId);
    return amt ? { amt, leistung: l } : null;
  }, [vorauswahl, tenant]);

  const [auswahl, setAuswahl] = useState<Auswahl | null>(start);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [tag, setTag] = useState<string>();
  const [slot, setSlot] = useState<Slot>();
  const [name, setName] = useState(konto ? `${konto.vorname} ${konto.nachname}`.trim() : "");
  const [email, setEmail] = useState(konto?.email ?? "");
  const [hinweis, setHinweis] = useState("");
  const [video, setVideo] = useState(false);
  const videoMoeglich = !!auswahl && aktiv(tenant, "videoBeratung") && !!tenant.videoBeratung?.aemter.includes(auswahl.amt.id);
  const [einw, setEinw] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [fertig, setFertig] = useState<{ id: string; ort: string; videoLink?: string } | null>(null);
  const kontaktRef = useRef<HTMLDivElement>(null);
  const zeitenRef = useRef<HTMLDivElement>(null);

  // Freie Termine laden
  useEffect(() => {
    if (!auswahl) return;
    setSlots(null);
    setTag(undefined);
    setSlot(undefined);
    fetch(`/api/termine/slots?amt=${auswahl.amt.id}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]));
  }, [auswahl]);

  const proTag = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of slots ?? []) m.set(s.datum, (m.get(s.datum) ?? 0) + 1);
    return m;
  }, [slots]);

  const zeiten = (slots ?? []).filter((s) => s.datum === tag);
  const locale = de ? "de-DE" : "en-GB";
  const datumLang = (d: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(d + "T12:00:00"));

  const buchen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auswahl || !slot) return;
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !einw) {
      setFehler(de ? "Bitte geben Sie Ihren Namen und eine gültige E-Mail-Adresse an und bestätigen Sie den Datenschutzhinweis." : "Please enter your name and a valid email address and confirm the privacy notice.");
      return;
    }
    setSendet(true);
    setFehler(null);
    try {
      const res = await fetch("/api/termine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amtId: auswahl.amt.id, leistungId: auswahl.leistung?.id, slot: slot.id, name, email, hinweis: hinweis || undefined, video: videoMoeglich && video, einwilligung: true }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setFehler(de ? "Dieser Termin wurde gerade vergeben. Bitte wählen Sie eine andere Uhrzeit." : "This slot was just taken. Please choose another time.");
        setSlots((s) => s?.filter((x) => x.id !== slot.id) ?? null);
        setSlot(undefined);
        return;
      }
      if (!res.ok) throw new Error(res.status === 429 ? t.zuVieleAnfragen : t.fehlerAllgemein);
      if (!konto) speichereAnliegen({
        id: data.id,
        code: data.zugangscode,
        typ: "termin",
        titel: `${tx(auswahl.amt.name, lang)}${auswahl.leistung ? ` – ${tx(auswahl.leistung.titel, lang)}` : ""}`,
        erstelltAm: new Date().toISOString(),
      });
      setFertig({ id: data.id, ort: data.ort, videoLink: data.videoLink });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setSendet(false);
    }
  };

  if (fertig && auswahl && slot) {
    return (
      <motion.div variants={gestaffelt(0.08)} initial="hidden" animate="show" className="mx-auto w-full max-w-xl px-4 text-center sm:px-6">
        <motion.div variants={{ hidden: { scale: 0.6, opacity: 0 }, show: { scale: 1, opacity: 1, transition: feder.klein } }} className="mx-auto grid size-20 place-items-center rounded-full bg-accent text-on-accent">
          <Icon name="calendar" className="size-9" />
        </motion.div>
        <motion.h1 variants={einblenden} className="mt-8 text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
          {de ? "Ihr Termin ist gebucht." : "Your appointment is booked."}
        </motion.h1>
        <motion.p variants={einblenden} className="mt-3 text-[17px] text-muted">
          {de ? `Eine Bestätigung mit Kalendereintrag haben wir an ${email} gesendet.` : `We have sent a confirmation with a calendar entry to ${email}.`}
        </motion.p>
        <motion.div variants={einblenden} className="mt-8">
          <Glass className="rounded-[24px] p-6 text-left">
            <p className="text-[22px] font-semibold tracking-[-0.02em]">{datumLang(slot.datum)}</p>
            <p className="mt-1 text-[17px]">
              {slot.zeit} {de ? "Uhr" : ""}
            </p>
            {fertig.videoLink ? (
              <p className="mt-4 flex items-start gap-2 text-[15px] text-muted">
                <Icon name="video" className="mt-0.5 size-4 shrink-0" />
                {de ? "Video-Beratung – den Link finden Sie in der E-Mail und unter „Meine Anliegen“." : "Video consultation – the link is in your email and under “My requests”."}
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2 text-[15px] text-muted">
                <Icon name="location" className="mt-0.5 size-4 shrink-0" />
                {fertig.ort}
              </p>
            )}
            <p className="mt-2 text-[13px] text-subtle">
              {de ? "Buchungsnummer" : "Booking number"}: <span className="font-mono">{fertig.id}</span>
            </p>
            {!fertig.videoLink && auswahl.leistung && auswahl.leistung.unterlagen.length > 0 && (
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">{de ? "Bitte mitbringen" : "Please bring"}</h2>
                <ul className="prose-calm text-[15px]">
                  {auswahl.leistung.unterlagen.map((u, i) => (
                    <li key={i}>{tx(u, lang)}</li>
                  ))}
                </ul>
              </div>
            )}
          </Glass>
        </motion.div>
        <motion.div variants={einblenden} className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/meine-anliegen">{t.menuAnliegen}</ButtonLink>
          <ButtonLink href="/" variant="glass">
            {t.startseite}
          </ButtonLink>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <motion.div variants={gestaffelt(0.06)} initial="hidden" animate="show">
        <motion.h1 variants={einblenden} className="text-[34px] font-semibold tracking-[-0.03em] sm:text-[44px]">
          {de ? "Termin buchen" : "Book an appointment"}
        </motion.h1>
        <motion.p variants={einblenden} className="mt-2 text-[17px] text-muted">
          {de ? "Wählen Sie Ihr Anliegen, einen Tag und eine Uhrzeit." : "Choose your request, a day and a time."}
        </motion.p>

        {/* 1. Anliegen */}
        <motion.section variants={einblenden} className="mt-10" aria-labelledby="h-anliegen">
          <h2 id="h-anliegen" className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">
            <span className="grid size-5 place-items-center rounded-full bg-[var(--line)] text-[11px] text-fg">1</span>
            {de ? "Ihr Anliegen" : "Your request"}
          </h2>
          {auswahl ? (
            <Glass className="flex items-center justify-between gap-4 rounded-[24px] px-6 py-4">
              <div>
                <p className="text-[16px] font-medium">{auswahl.leistung ? tx(auswahl.leistung.titel, lang) : de ? "Sonstiges Anliegen" : "Other request"}</p>
                <p className="text-[14px] text-subtle">
                  {tx(auswahl.amt.name, lang)} · {tx(auswahl.amt.ort, lang)}
                </p>
              </div>
              <button type="button" onClick={() => setAuswahl(null)} className="rounded-full px-3 py-2 text-[14px] font-medium text-accent pressable">
                {de ? "Ändern" : "Change"}
              </button>
            </Glass>
          ) : (
            <div className="space-y-6">
              {gruppen.map(({ amt, leistungen }) => (
                <div key={amt.id}>
                  <p className="mb-2 text-[15px] font-medium">{tx(amt.name, lang)}</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {[...leistungen, undefined].map((l) => (
                      <li key={l?.id ?? "sonst"}>
                        <button
                          type="button"
                          onClick={() => setAuswahl({ amt, leistung: l })}
                          className="glass pressable flex w-full items-center justify-between gap-3 rounded-[16px] px-4 py-4 text-left text-[15px]"
                        >
                          {l ? tx(l.titel, lang) : de ? "Sonstiges Anliegen" : "Other request"}
                          <Icon name="chevronRight" className="size-4 shrink-0 text-subtle" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* 2. Tag & Uhrzeit */}
        <AnimatePresence>
          {auswahl && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={feder.klein} className="mt-10" aria-labelledby="h-zeit">
              <h2 id="h-zeit" className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">
                <span className="grid size-5 place-items-center rounded-full bg-[var(--line)] text-[11px] text-fg">2</span>
                {de ? "Tag und Uhrzeit" : "Day and time"}
              </h2>
              <Glass className="grid gap-6 rounded-[24px] p-6 md:grid-cols-[1.15fr_1fr]">
                {slots === null ? (
                  <p className="text-[15px] text-subtle" role="status">
                    {t.einenMoment}
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-[15px] text-muted md:col-span-2">
                    {de ? "Zurzeit sind keine Termine frei. Bitte versuchen Sie es später erneut oder rufen Sie uns an." : "No appointments are currently available."}{" "}
                    <Link href="/kontakt" className="text-accent underline underline-offset-2">
                      {t.menuKontakt}
                    </Link>
                  </p>
                ) : (
                  <>
                    <Calendar
                      verfuegbar={proTag}
                      gewaehlt={tag}
                      onWaehle={(d) => {
                        setTag(d);
                        setSlot(undefined);
                        requestAnimationFrame(() => zeitenRef.current?.querySelector("button")?.focus({ preventScroll: true }));
                      }}
                    />
                    <div ref={zeitenRef} className="md:border-l md:border-[var(--line)] md:pl-6">
                      {tag ? (
                        <>
                          <h3 className="mb-3 text-[15px] font-medium">{datumLang(tag)}</h3>
                          <div role="group" aria-label={de ? "Uhrzeit wählen" : "Choose time"} className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
                            {zeiten.map((s, i) => (
                              <motion.button
                                key={s.id}
                                type="button"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ ...feder.klein, delay: i * 0.012 }}
                                onClick={() => {
                                  setSlot(s);
                                  requestAnimationFrame(() => kontaktRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                                }}
                                aria-pressed={slot?.id === s.id}
                                className={`rounded-[12px] border py-3 text-[15px] font-medium tabular-nums ${
                                  slot?.id === s.id
                                    ? "border-accent bg-accent text-on-accent"
                                    : "border-[color-mix(in_srgb,var(--fg)_12%,transparent)] hover:border-accent"
                                }`}
                              >
                                {s.zeit}
                              </motion.button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="flex h-full items-center text-[15px] text-subtle">{de ? "Bitte wählen Sie zuerst einen Tag." : "Please choose a day first."}</p>
                      )}
                    </div>
                  </>
                )}
              </Glass>
            </motion.section>
          )}
        </AnimatePresence>

        {/* 3. Kontaktdaten */}
        <AnimatePresence>
          {slot && auswahl && (
            <motion.section
              ref={kontaktRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={feder.klein}
              className="mt-10 scroll-mt-24"
              aria-labelledby="h-kontakt"
            >
              <h2 id="h-kontakt" className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">
                <span className="grid size-5 place-items-center rounded-full bg-[var(--line)] text-[11px] text-fg">3</span>
                {de ? "Ihre Kontaktdaten" : "Your contact details"}
              </h2>
              <form onSubmit={buchen} noValidate>
                <Glass className="grid gap-5 rounded-[24px] p-6 sm:grid-cols-2 sm:p-6">
                  <p className="text-[15px] sm:col-span-2">
                    <span className="font-medium">{datumLang(slot.datum)}</span>, {slot.zeit} {de ? "Uhr" : ""}
                  </p>
                  <div>
                    <label htmlFor="b-name" className="text-[15px] font-medium">
                      {de ? "Vor- und Nachname" : "Full name"}
                    </label>
                    <input id="b-name" className="field-input mt-2" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                  </div>
                  <div>
                    <label htmlFor="b-mail" className="text-[15px] font-medium">
                      {de ? "E-Mail-Adresse" : "Email address"}
                    </label>
                    <input id="b-mail" type="email" className="field-input mt-2" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required />
                  </div>
                  {videoMoeglich && (
                    <fieldset className="sm:col-span-2">
                      <legend className="text-[15px] font-medium">{de ? "Wie möchten Sie den Termin wahrnehmen?" : "How would you like to attend?"}</legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="choice">
                          <input type="radio" name="b-art" className="radio" checked={!video} onChange={() => setVideo(false)} />
                          <span className="text-[15px]">{de ? "Vor Ort im Rathaus" : "In person"}</span>
                        </label>
                        <label className="choice">
                          <input type="radio" name="b-art" className="radio" checked={video} onChange={() => setVideo(true)} />
                          <span className="text-[15px]">
                            {de ? "Per Video" : "By video"}
                            <span className="block text-[13px] text-subtle">{de ? "Für Beratung und Fragen – im Browser, ohne Installation." : "For advice – in your browser, no installation."}</span>
                          </span>
                        </label>
                      </div>
                    </fieldset>
                  )}
                  <div className="sm:col-span-2">
                    <label htmlFor="b-hinweis" className="text-[15px] font-medium">
                      {de ? "Benötigen Sie Unterstützung? (freiwillig)" : "Do you need assistance? (optional)"}
                    </label>
                    <p id="b-hinweis-h" className="mt-1 text-[13px] text-subtle">
                      {de ? "Zum Beispiel einen barrierefreien Zugang oder eine Gebärdensprachdolmetschung." : "For example step-free access or a sign language interpreter."}
                    </p>
                    <input id="b-hinweis" aria-describedby="b-hinweis-h" className="field-input mt-2" value={hinweis} onChange={(e) => setHinweis(e.target.value)} maxLength={300} />
                  </div>
                  <label className="choice sm:col-span-2">
                    <input type="checkbox" className="checkbox" checked={einw} onChange={(e) => setEinw(e.target.checked)} aria-required="true" />
                    <span className="text-[15px] leading-relaxed">
                      {de
                        ? `Ich bin einverstanden, dass meine Angaben zur Terminvergabe verarbeitet werden. Sie werden 14 Tage nach dem Termin gelöscht.`
                        : `I agree that my details are processed for booking. They are deleted 14 days after the appointment.`}{" "}
                      <Link href="/datenschutz" target="_blank" className="text-accent underline underline-offset-2">
                        {t.datenschutz}
                      </Link>
                    </span>
                  </label>
                  {fehler && (
                    <p role="alert" className="text-[14px] text-danger sm:col-span-2">
                      {fehler}
                    </p>
                  )}
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={sendet} aria-busy={sendet} className="min-h-12 w-full text-[16px] sm:w-auto sm:px-8">
                      {sendet ? (de ? "Wird gebucht …" : "Booking …") : de ? "Termin verbindlich buchen" : "Book appointment"}
                    </Button>
                  </div>
                </Glass>
              </form>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
