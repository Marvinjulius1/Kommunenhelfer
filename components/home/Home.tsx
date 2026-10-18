"use client";

/**
 * Startseite – radikal reduziert: Wappen, "Bürgerservice online", Eingabefeld.
 *
 * Nach der ersten Eingabe bleibt das Eingabefeld DASSELBE Element und gleitet
 * per Shared-Layout-Animation (nur transform) nach unten; das Wappen wird
 * kleiner und rückt nach oben. Kein Umschalten, kein Layout-Sprung.
 */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Antwort, Nachricht } from "@/lib/assistant/types";
import { entwurfId, useUploads } from "@/lib/client/uploads";
import { deutsch, tx, untertitel } from "@/lib/i18n";
import { einblenden, feder, uebergang } from "@/lib/motion";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { Vorschau } from "@/components/upload/AttachmentTray";
import { ConsentSheet } from "@/components/upload/ConsentSheet";
import { DropOverlay } from "@/components/upload/DropOverlay";
import type { EinreichungErgebnis } from "@/components/upload/Einreichung";
import { SafeSheet } from "@/components/upload/SafeSheet";
import { ScanSheet } from "@/components/upload/ScanSheet";
import { AnswerBlock, Denkt } from "./AnswerBlock";
import { AskField, type AskFieldHandle } from "./AskField";

interface AnhangInfo {
  id: string;
  name: string;
  typ: string | null;
}

type Eintrag =
  | { id: string; rolle: "buerger"; text: string; anhaenge?: AnhangInfo[] }
  | { id: string; rolle: "assistent"; antwort: Antwort; ergebnis?: EinreichungErgebnis }
  | { id: string; rolle: "fehler"; text: string };

const SPEICHER = "gespraech.v2";
const uid = () => Math.random().toString(36).slice(2, 10);

export function Home() {
  const { tenant, lang, t, konto } = useTenant();
  const de = deutsch(lang);
  const [verlauf, setVerlauf] = useState<Eintrag[]>([]);
  const [laedt, setLaedt] = useState(false);
  const [scan, setScan] = useState(false);
  const [safe, setSafe] = useState(false);
  const [vorschauen, setVorschauen] = useState<Record<string, string | undefined>>({});
  const askRef = useRef<AskFieldHandle>(null);
  const letzterRef = useRef<HTMLDivElement>(null);
  const up = useUploads(tenant, lang);
  const uploadsAktiv = tenant.uploads.aktiv;

  // Gespräch nur für diese Sitzung merken (z. B. für "Zurück" aus einem Antrag).
  // Beim Schließen des Tabs ist es weg – Datensparsamkeit.
  useLayoutEffect(() => {
    try {
      const s = sessionStorage.getItem(SPEICHER);
      if (s) setVerlauf(JSON.parse(s));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (verlauf.length) sessionStorage.setItem(SPEICHER, JSON.stringify(verlauf));
      else sessionStorage.removeItem(SPEICHER);
    } catch {}
  }, [verlauf]);

  // Neue Frage sanft in den Blick rücken (nur wenn sie nicht schon sichtbar ist).
  useEffect(() => {
    const el = letzterRef.current;
    if (!el || verlauf.length < 2) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [verlauf.length]);

  const kontextLeistungId = [...verlauf].reverse().find((e): e is Extract<Eintrag, { rolle: "assistent" }> => e.rolle === "assistent")?.antwort.leistungId;

  const senden = useCallback(
    async (text: string, leistungId?: string) => {
      const anhaenge = up.uebergeben();
      if (anhaenge.length) setVorschauen((v) => ({ ...v, ...Object.fromEntries(anhaenge.map((a) => [a.serverId!, a.vorschau])) }));
      const buerger: Eintrag = {
        id: uid(),
        rolle: "buerger",
        text: text || (de ? "Ich möchte Unterlagen einreichen." : "I would like to submit documents."),
        anhaenge: anhaenge.length ? anhaenge.map((a) => ({ id: a.serverId!, name: a.name, typ: a.typ })) : undefined,
      };
      const neu = [...verlauf, buerger];
      setVerlauf(neu);
      setLaedt(true);

      const nachrichten: Nachricht[] = neu
        .filter((e) => e.rolle !== "fehler")
        .map((e) => (e.rolle === "assistent" ? { rolle: "assistent", text: e.antwort.text } : { rolle: "buerger", text: (e as { text: string }).text }));

      try {
        const res = await fetch("/api/assistent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            nachrichten,
            leistungId,
            kontextLeistungId,
            lang,
            ...(anhaenge.length ? { entwurf: entwurfId(), dokumente: anhaenge.map((a) => a.serverId) } : {}),
          }),
        });
        if (res.status === 429) throw new Error(t.zuVieleAnfragen);
        if (!res.ok) throw new Error(t.fehlerAllgemein);
        const antwort = (await res.json()) as Antwort;
        setVerlauf((v) => [...v, { id: uid(), rolle: "assistent", antwort }]);
      } catch (e) {
        setVerlauf((v) => [...v, { id: uid(), rolle: "fehler", text: (e as Error).message || t.fehlerAllgemein }]);
      } finally {
        setLaedt(false);
        requestAnimationFrame(() => askRef.current?.focus());
      }
    },
    [verlauf, kontextLeistungId, lang, t, de, up],
  );

  const neuesAnliegen = () => {
    setVerlauf([]);
    entwurfId(true);
    requestAnimationFrame(() => askRef.current?.focus());
  };

  const gespraech = verlauf.length > 0;
  const letzteFrage = verlauf.map((e) => e.rolle).lastIndexOf("buerger");
  const letzteAntwort = verlauf.map((e) => e.rolle).lastIndexOf("assistent");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6">
      {uploadsAktiv && <DropOverlay aktiv onDateien={up.hinzufuegen} />}
      <ConsentSheet offen={up.einwilligungNoetig} onJa={up.einwilligen} onNein={up.ablehnen} />
      <ScanSheet offen={scan} onClose={() => setScan(false)} onFertig={(f) => up.hinzufuegen([f])} />
      {konto && <SafeSheet offen={safe} onClose={() => setSafe(false)} onWahl={up.ausSafe} />}

      {/* Kopf: Wappen + Schrift. Im Gespräch klein und oben. */}
      <div className={gespraech ? "flex items-center justify-between gap-2 pb-6 pr-10 pt-[max(16px,env(safe-area-inset-top))]" : "flex flex-1 flex-col items-center justify-end pb-8 pt-16"}>
        <div className={gespraech ? "flex min-w-0 items-center gap-3" : "flex flex-col items-center"}>
          <motion.img
            layout
            transition={feder.layout}
            src={tenant.wappen}
            alt={tenant.wappenAlt}
            width={120}
            height={140}
            fetchPriority="high"
            className={gespraech ? "h-9 w-auto" : "h-24 w-auto sm:h-28"}
          />
          <h1 className="sr-only">
            {tenant.art} {tenant.name} – {untertitel(tenant, lang)}
          </h1>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={gespraech ? "klein" : "gross"}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { ...uebergang.lang, delay: gespraech ? 0.12 : 0.05 } }}
              exit={{ opacity: 0, transition: uebergang.kurz }}
              className={gespraech ? "truncate text-[15px] tracking-[0.01em] text-muted" : "mt-8 text-[24px] font-light tracking-[0.02em] text-fg sm:text-[28px]"}
            >
              {untertitel(tenant, lang)}
            </motion.p>
          </AnimatePresence>
        </div>
        {gespraech && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { ...uebergang.mittel, delay: 0.15 } }}
            type="button"
            onClick={neuesAnliegen}
            aria-label={t.neuesAnliegen}
            className="pressable flex h-10 shrink-0 items-center gap-2 rounded-full px-2 text-[14px] text-muted hover:text-fg sm:px-4"
          >
            <Icon name="refresh" className="size-4" />
            <span className="hidden sm:inline">{t.neuesAnliegen}</span>
          </motion.button>
        )}
      </div>

      {/* Gesprächsverlauf */}
      {gespraech && (
        <section role="log" aria-live="polite" aria-relevant="additions" aria-label={de ? "Gesprächsverlauf" : "Conversation"} className="flex flex-1 flex-col gap-8 pb-8">
          {verlauf.map((e, i) => (
            <div key={e.id} ref={i === letzteFrage ? letzterRef : undefined} className="scroll-mt-8">
              {e.rolle === "buerger" && (
                <motion.div variants={einblenden} initial="hidden" animate="show" className="flex flex-col items-end gap-2">
                  {e.anhaenge && (
                    <ul className="flex flex-wrap justify-end gap-2" aria-label={de ? "Gesendete Unterlagen" : "Sent documents"}>
                      {e.anhaenge.map((a) => (
                        <li key={a.id} className="flex max-w-56 items-center gap-2 rounded-[16px] bg-[var(--line)] p-1 pr-4">
                          <Vorschau src={vorschauen[a.id]} typ={a.typ} className="size-10" />
                          <span className="truncate text-[13px]">{a.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-[8px] bg-[var(--line)] px-4 py-2 text-[16px] leading-relaxed">
                    <span className="sr-only">{t.sie}: </span>
                    {e.text}
                  </p>
                </motion.div>
              )}
              {e.rolle === "assistent" && (
                <AnswerBlock
                  antwort={e.antwort}
                  aktiv={!laedt && i === letzteAntwort}
                  onOption={(id, label) => senden(label, id)}
                  vorschauen={vorschauen}
                  nachricht={(verlauf[i - 1] as { text?: string })?.text ?? ""}
                  ergebnis={e.ergebnis}
                  onAbgesendet={(ergebnis) => setVerlauf((v) => v.map((x) => (x.id === e.id ? { ...x, ergebnis } : x)))}
                />
              )}
              {e.rolle === "fehler" && (
                <motion.p variants={einblenden} initial="hidden" animate="show" role="alert" className="text-[15px] text-danger">
                  {e.text}
                </motion.p>
              )}
            </div>
          ))}
          <AnimatePresence>{laedt && <Denkt />}</AnimatePresence>
        </section>
      )}

      {/* Eingabefeld: dasselbe Element in beiden Zuständen */}
      <motion.div
        layout="position"
        transition={feder.layout}
        className={
          gespraech
            ? "sticky bottom-0 z-20 -mx-4 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:-mx-6 sm:px-6"
            : "flex-1 pb-24"
        }
      >
        <AskField
          ref={askRef}
          size="hero"
          onSubmit={(text) => senden(text)}
          disabled={laedt}
          placeholder={tx(tenant.texte.platzhalter, lang)}
          describedBy={gespraech ? "ki-hinweis" : undefined}
          uploads={
            uploadsAktiv
              ? { anhaenge: up.anhaenge, laedt: up.laedt, onDateien: up.hinzufuegen, onScan: () => setScan(true), onSafe: konto ? () => setSafe(true) : undefined, onEntfernen: up.entfernen, onErneut: up.erneut }
              : undefined
          }
        />
        {!gespraech && !!tenant.gemeinden?.length && (
          <p className="mt-6 text-center text-[15px]">
            <Link href="/gemeinden" className="inline-flex items-center gap-1 text-accent underline underline-offset-4">
              {de ? "Anliegen bei Ihrer Gemeinde? Hier geht es zu Ihrer Gemeinde" : "Something for your municipality? Find it here"}
              <Icon name="chevronRight" className="size-4 rtl:-scale-x-100" />
            </Link>
          </p>
        )}
        <div aria-live="polite">
          {up.hinweis && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center justify-center gap-2 text-center text-[13px] text-muted">
              {up.hinweis}
              <button type="button" onClick={() => up.setHinweis(null)} aria-label={de ? "Hinweis schließen" : "Dismiss"} className="pressable grid size-6 place-items-center rounded-full">
                <Icon name="close" className="size-3.5" />
              </button>
            </motion.p>
          )}
        </div>
        {gespraech && (
          <motion.p id="ki-hinweis" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} className="mt-2 text-center text-[12px] text-subtle">
            {de
              ? `Antworten erstellt ein KI-System auf Grundlage der Informationen der ${tenant.art} ${tenant.name}. Entscheidungen trifft immer das Amt.`
              : `Answers are generated by an AI system based on information from ${tenant.name}. Decisions are always made by the office.`}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
