"use client";

/**
 * Geführter Online-Antrag.
 * Phasen: Einstieg → Schritte → Prüfen & Absenden → Bestätigung.
 * Die Schritte und Felder kommen vollständig aus der Gemeinde-Konfiguration.
 */
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Leistung } from "@/config/types";
import { useTenant } from "@/components/TenantProvider";
import { LeistungDetails } from "@/components/home/LeistungDetails";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { anzeigeWert, istSichtbar, validiereSchritt, type Fehler, type Werte } from "@/lib/flows/validate";
import { speichereAnliegen } from "@/lib/client/anliegen";
import { fadeUp, spring, stagger } from "@/lib/client/motion";
import { tx } from "@/lib/i18n";
import { Field } from "./Field";

type Phase = { typ: "start" } | { typ: "schritt"; index: number; zurUebersicht?: boolean } | { typ: "pruefen" } | { typ: "fertig"; nummer: string };

export function Antrag({ leistung }: { leistung: Leistung }) {
  const { tenant, lang, t } = useTenant();
  const formular = leistung.formular!;
  const schritte = formular.schritte;
  const reduce = useReducedMotion();
  const de = lang === "de";

  const startwerte = useMemo(() => {
    const w: Werte = {};
    for (const s of schritte) for (const f of s.felder) if (f.standard) w[f.id] = f.standard;
    return w;
  }, [schritte]);

  const entwurfKey = `entwurf.${tenant.slug}.${leistung.id}`;
  const [phase, setPhase] = useState<Phase>({ typ: "start" });
  const [richtung, setRichtung] = useState(1);
  const [werte, setWerte] = useState<Werte>(startwerte);
  const [fehler, setFehler] = useState<Fehler>({});
  const [einw, setEinw] = useState<Record<string, boolean>>({});
  const [einwFehler, setEinwFehler] = useState(false);
  const [sendet, setSendet] = useState(false);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Entwurf nur für diese Sitzung (ohne sensible Felder wie IBAN)
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(entwurfKey);
      if (s) setWerte((w) => ({ ...w, ...JSON.parse(s) }));
    } catch {}
  }, [entwurfKey]);
  useEffect(() => {
    const sensibel = new Set(schritte.flatMap((s) => s.felder.filter((f) => f.sensibel).map((f) => f.id)));
    const ohne = Object.fromEntries(Object.entries(werte).filter(([k]) => !sensibel.has(k)));
    try {
      sessionStorage.setItem(entwurfKey, JSON.stringify(ohne));
    } catch {}
  }, [werte, entwurfKey, schritte]);

  // Fokus nach Phasenwechsel auf die Überschrift (Screenreader & Tastatur)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [phase, reduce]);

  const setWert = (id: string, v: string) => {
    setWerte((w) => ({ ...w, [id]: v }));
    if (fehler[id]) setFehler(({ [id]: _, ...rest }) => rest);
  };

  const gehe = (p: Phase, dir: number) => {
    setRichtung(dir);
    setFehler({});
    setPhase(p);
  };

  const weiter = () => {
    if (phase.typ !== "schritt") return;
    const f = validiereSchritt(schritte[phase.index], werte, lang);
    if (Object.keys(f).length) {
      setFehler(f);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (phase.zurUebersicht || phase.index === schritte.length - 1) gehe({ typ: "pruefen" }, 1);
    else gehe({ typ: "schritt", index: phase.index + 1 }, 1);
  };

  const zurueck = () => {
    if (phase.typ === "schritt") gehe(phase.index === 0 ? { typ: "start" } : { typ: "schritt", index: phase.index - 1 }, -1);
    else if (phase.typ === "pruefen") gehe({ typ: "schritt", index: schritte.length - 1 }, -1);
  };

  const absenden = async () => {
    const noetig = ["datenschutz", ...(formular.bestaetigungen ?? []).map((b) => b.id)];
    if (!noetig.every((id) => einw[id])) {
      setEinwFehler(true);
      return;
    }
    setSendet(true);
    setServerFehler(null);
    try {
      const res = await fetch("/api/antrag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leistungId: leistung.id,
          werte,
          einwilligungen: Object.fromEntries(noetig.map((id) => [id, true])),
          lang,
        }),
      });
      const data = await res.json();
      if (res.status === 422 && data.felder) {
        // Server hat abweichend geprüft → zum ersten fehlerhaften Schritt
        const idx = schritte.findIndex((s) => s.felder.some((f) => data.felder[f.id]));
        setFehler(data.felder);
        setPhase({ typ: "schritt", index: Math.max(0, idx), zurUebersicht: true });
        return;
      }
      if (!res.ok) throw new Error(res.status === 429 ? t.zuVieleAnfragen : t.fehlerAllgemein);
      speichereAnliegen({ id: data.vorgangsnummer, code: data.zugangscode, typ: "antrag", titel: tx(leistung.titel, lang), erstelltAm: new Date().toISOString() });
      try {
        sessionStorage.removeItem(entwurfKey);
      } catch {}
      gehe({ typ: "fertig", nummer: data.vorgangsnummer }, 1);
    } catch (e) {
      setServerFehler((e as Error).message);
    } finally {
      setSendet(false);
    }
  };

  const titel = tx(leistung.titel, lang);
  const fortschritt = phase.typ === "schritt" ? (phase.index + 1) / (schritte.length + 1) : phase.typ === "pruefen" ? 1 : 0;
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -24 }),
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
      {/* Fortschritt */}
      {(phase.typ === "schritt" || phase.typ === "pruefen") && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-[13px] text-subtle">
            <span>{titel}</span>
            <span aria-live="polite">
              {phase.typ === "schritt"
                ? de
                  ? `Schritt ${phase.index + 1} von ${schritte.length + 1}`
                  : `Step ${phase.index + 1} of ${schritte.length + 1}`
                : de
                  ? `Schritt ${schritte.length + 1} von ${schritte.length + 1}`
                  : `Step ${schritte.length + 1} of ${schritte.length + 1}`}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true">
            <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${fortschritt * 100}%` }} transition={spring} />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" custom={richtung} initial={false}>
        <motion.div
          key={phase.typ === "schritt" ? `s${phase.index}` : phase.typ}
          custom={richtung}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ---------- Einstieg ---------- */}
          {phase.typ === "start" && (
            <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-fg">
                  <Icon name="chevronLeft" className="size-4" />
                  {t.zurueck}
                </Link>
              </motion.div>
              <motion.h1 variants={fadeUp} ref={headingRef} tabIndex={-1} className="text-[34px] font-semibold leading-tight tracking-[-0.03em] outline-none sm:text-[44px]">
                {titel}
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-3 text-[17px] leading-relaxed text-muted">
                {tx(leistung.kurz, lang)}
              </motion.p>
              {leistung.dauer && (
                <motion.p variants={fadeUp} className="mt-4 inline-flex items-center gap-2 text-[14px] text-subtle">
                  <Icon name="clock" className="size-4" />
                  {t.dauer}: {tx(leistung.dauer, lang)}
                </motion.p>
              )}
              <motion.div variants={fadeUp} className="mt-8">
                <Glass className="rounded-[26px] p-5 sm:p-7">
                  <LeistungDetails leistung={leistung} />
                </Glass>
              </motion.div>
              <motion.p variants={fadeUp} className="mt-6 text-[13px] leading-relaxed text-subtle">
                {de
                  ? `Ihre Angaben werden verschlüsselt übertragen und gespeichert. Sie werden ausschließlich zur Bearbeitung Ihres Antrags verwendet und nach ${formular.aufbewahrungTage} Tagen aus dem Portal gelöscht.`
                  : `Your data is transmitted and stored encrypted. It is used only to process your application and deleted from the portal after ${formular.aufbewahrungTage} days.`}{" "}
                <Link href="/datenschutz" className="text-accent underline-offset-2 hover:underline">
                  {t.datenschutz}
                </Link>
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => gehe({ typ: "schritt", index: 0 }, 1)} className="min-h-12 px-7 text-[16px]">
                  {de ? "Antrag starten" : "Start application"}
                  <Icon name="arrowRight" className="size-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ---------- Formularschritte ---------- */}
          {phase.typ === "schritt" && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                weiter();
              }}
            >
              <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-semibold tracking-[-0.025em] outline-none sm:text-[34px]">
                {tx(schritte[phase.index].titel, lang)}
              </h1>
              {schritte[phase.index].beschreibung && (
                <p className="mt-2 text-[16px] text-muted">{tx(schritte[phase.index].beschreibung, lang)}</p>
              )}

              {Object.keys(fehler).length > 0 && (
                <div ref={summaryRef} tabIndex={-1} role="alert" className="mt-6 rounded-2xl border border-danger/40 bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] p-4 text-[15px] outline-none">
                  <p className="font-medium text-danger">{de ? "Bitte prüfen Sie Ihre Eingaben:" : "Please check your entries:"}</p>
                  <ul className="mt-2 space-y-1">
                    {schritte[phase.index].felder
                      .filter((f) => fehler[f.id])
                      .map((f) => (
                        <li key={f.id}>
                          <a href={`#feld-${f.id}`} className="text-danger underline underline-offset-2">
                            {tx(f.label, lang)}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <Glass className="mt-6 rounded-[26px] p-5 sm:p-7">
                <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {schritte[phase.index].felder
                      .filter((f) => istSichtbar(f, werte))
                      .map((f) => (
                        <motion.div
                          key={f.id}
                          layout={!reduce}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={spring}
                          className={f.halb ? "" : "sm:col-span-2"}
                        >
                          <Field feld={f} wert={werte[f.id] ?? ""} fehler={fehler[f.id]} onChange={(v) => setWert(f.id, v)} />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              </Glass>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button type="button" variant="glass" onClick={zurueck}>
                  <Icon name="chevronLeft" className="size-4" />
                  {t.zurueck}
                </Button>
                <Button type="submit" className="px-7">
                  {phase.zurUebersicht ? (de ? "Zur Übersicht" : "To summary") : t.weiter}
                  <Icon name="arrowRight" className="size-4" />
                </Button>
              </div>
            </form>
          )}

          {/* ---------- Prüfen ---------- */}
          {phase.typ === "pruefen" && (
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-[28px] font-semibold tracking-[-0.025em] outline-none sm:text-[34px]">
                {de ? "Bitte prüfen Sie Ihre Angaben" : "Please check your details"}
              </h1>
              <p className="mt-2 text-[16px] text-muted">
                {de ? "Sie können jeden Abschnitt noch ändern." : "You can still change every section."}
              </p>

              <div className="mt-6 space-y-4">
                {schritte.map((s, i) => (
                  <Glass key={s.id} className="rounded-[24px] p-5 sm:p-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-[17px] font-semibold">{tx(s.titel, lang)}</h2>
                      <button
                        type="button"
                        onClick={() => gehe({ typ: "schritt", index: i, zurUebersicht: true }, -1)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium text-accent hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                      >
                        <Icon name="edit" className="size-4" />
                        {de ? "Ändern" : "Change"}
                        <span className="sr-only">: {tx(s.titel, lang)}</span>
                      </button>
                    </div>
                    <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
                      {s.felder
                        .filter((f) => istSichtbar(f, werte) && f.typ !== "checkbox")
                        .map((f) => (
                          <div key={f.id} className={f.typ === "textarea" ? "sm:col-span-2" : ""}>
                            <dt className="text-[13px] text-subtle">{tx(f.label, lang)}</dt>
                            <dd className="mt-0.5 break-words">{anzeigeWert(f, werte[f.id], lang)}</dd>
                          </div>
                        ))}
                    </dl>
                  </Glass>
                ))}
              </div>

              <fieldset className="mt-8 space-y-3" aria-describedby={einwFehler ? "einw-fehler" : undefined}>
                <legend className="sr-only">{de ? "Bestätigungen" : "Confirmations"}</legend>
                {[
                  {
                    id: "datenschutz",
                    label: de
                      ? `Ich habe die Datenschutzhinweise gelesen und bin einverstanden, dass die ${tenant.art} ${tenant.name} meine Angaben zur Bearbeitung dieses Antrags verarbeitet.`
                      : `I have read the privacy notice and agree that ${tenant.name} processes my data to handle this application.`,
                  },
                  ...(formular.bestaetigungen ?? []).map((b) => ({ id: b.id, label: tx(b.label, lang) })),
                ].map((b) => (
                  <label key={b.id} className="choice">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={!!einw[b.id]}
                      onChange={(e) => {
                        setEinw((x) => ({ ...x, [b.id]: e.target.checked }));
                        setEinwFehler(false);
                      }}
                      aria-required="true"
                    />
                    <span className="text-[15px] leading-relaxed">
                      {b.label}
                      {b.id === "datenschutz" && (
                        <>
                          {" "}
                          <Link href="/datenschutz" target="_blank" className="text-accent underline underline-offset-2">
                            {t.datenschutz}
                          </Link>
                        </>
                      )}
                    </span>
                  </label>
                ))}
                {einwFehler && (
                  <p id="einw-fehler" role="alert" className="text-[14px] text-danger">
                    {de ? "Bitte bestätigen Sie alle Punkte, um den Antrag abzusenden." : "Please confirm all items to submit."}
                  </p>
                )}
              </fieldset>

              {serverFehler && (
                <p role="alert" className="mt-4 text-[15px] text-danger">
                  {serverFehler}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button type="button" variant="glass" onClick={zurueck}>
                  <Icon name="chevronLeft" className="size-4" />
                  {t.zurueck}
                </Button>
                <Button type="button" onClick={absenden} disabled={sendet} aria-busy={sendet} className="px-7">
                  {sendet ? (de ? "Wird gesendet …" : "Sending …") : de ? "Verbindlich absenden" : "Submit"}
                </Button>
              </div>
            </div>
          )}

          {/* ---------- Bestätigung ---------- */}
          {phase.typ === "fertig" && <Bestaetigung leistung={leistung} nummer={phase.nummer} headingRef={headingRef} email={werte.email} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Bestaetigung({
  leistung,
  nummer,
  headingRef,
  email,
}: {
  leistung: Leistung;
  nummer: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  email?: string;
}) {
  const { lang, t } = useTenant();
  const de = lang === "de";
  const [kopiert, setKopiert] = useState(false);
  return (
    <motion.div variants={stagger(0.08, 0.1)} initial="hidden" animate="show" className="text-center">
      <motion.div variants={{ hidden: { scale: 0.6, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 16 } } }} className="mx-auto grid size-20 place-items-center rounded-full bg-accent text-on-accent shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--accent)_70%,transparent)]">
        <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <motion.path d="M5 12.5 10 17.5 19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }} />
        </svg>
      </motion.div>
      <motion.h1 variants={fadeUp} ref={headingRef} tabIndex={-1} className="mt-8 text-[32px] font-semibold tracking-[-0.03em] outline-none sm:text-[40px]">
        {de ? "Vielen Dank." : "Thank you."}
      </motion.h1>
      <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-muted">
        {de ? `Ihr Antrag „${tx(leistung.titel, lang)}“ ist bei uns eingegangen.` : `Your application "${tx(leistung.titel, lang)}" has been received.`}
        {email && (de ? ` Eine Bestätigung haben wir an ${email} gesendet.` : ` We have sent a confirmation to ${email}.`)}
      </motion.p>

      <motion.div variants={fadeUp} className="mt-8 flex justify-center">
        <Glass className="flex items-center gap-4 rounded-full py-2 pl-6 pr-2">
          <span className="text-left">
            <span className="block text-[12px] text-subtle">{de ? "Vorgangsnummer" : "Reference number"}</span>
            <span className="font-mono text-[17px] font-medium tracking-wide">{nummer}</span>
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(nummer).then(() => setKopiert(true))}
            className="rounded-full px-3 py-2 text-[13px] font-medium text-accent hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
          >
            <span aria-live="polite">{kopiert ? (de ? "Kopiert" : "Copied") : de ? "Kopieren" : "Copy"}</span>
          </button>
        </Glass>
      </motion.div>

      <motion.div variants={fadeUp} className="mx-auto mt-10 max-w-md text-left">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">{de ? "So geht es weiter" : "What happens next"}</h2>
        <ol className="prose-calm text-[15px] leading-relaxed">
          {leistung.ablauf.slice(1).map((s, i) => (
            <li key={i}>{tx(s, lang)}</li>
          ))}
        </ol>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/meine-anliegen" variant="primary">
          {t.menuAnliegen}
        </ButtonLink>
        <ButtonLink href="/" variant="glass">
          {t.startseite}
        </ButtonLink>
      </motion.div>
    </motion.div>
  );
}
