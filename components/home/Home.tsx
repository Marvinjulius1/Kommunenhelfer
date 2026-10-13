"use client";

/**
 * Startseite: Wappen, Name, ein Eingabefeld. Nach der ersten Eingabe
 * gleitet die Seite sanft in die Gesprächsansicht – Wappen und Name
 * wandern nach oben, das Eingabefeld dockt unten an.
 */
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Antwort, Nachricht } from "@/lib/assistant/types";
import { fadeUp, spring, stagger } from "@/lib/client/motion";
import { tx } from "@/lib/i18n";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { AnswerBlock, KleinerLink, Warten } from "./AnswerBlock";
import { AskField, type AskFieldHandle } from "./AskField";

type Eintrag =
  | { id: string; rolle: "buerger"; text: string }
  | { id: string; rolle: "assistent"; antwort: Antwort }
  | { id: string; rolle: "fehler"; text: string };

const SPEICHER = "gespraech.v1";
const uid = () => Math.random().toString(36).slice(2, 10);

export function Home() {
  const { tenant, lang, t } = useTenant();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [verlauf, setVerlauf] = useState<Eintrag[]>([]);
  const [laedt, setLaedt] = useState(false);
  const [zeigeWarten, setZeigeWarten] = useState(false);
  const askRef = useRef<AskFieldHandle>(null);
  const endeRef = useRef<HTMLDivElement>(null);
  const letzterRef = useRef<HTMLDivElement>(null);

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

  // Neue Nachricht sanft in den Blick rücken.
  useEffect(() => {
    if (!verlauf.length) return;
    letzterRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [verlauf.length, reduce]);

  useEffect(() => {
    if (!laedt) return setZeigeWarten(false);
    const timer = setTimeout(() => setZeigeWarten(true), 300);
    return () => clearTimeout(timer);
  }, [laedt]);

  const kontextLeistungId = [...verlauf].reverse().find((e): e is Extract<Eintrag, { rolle: "assistent" }> => e.rolle === "assistent")?.antwort
    .leistungId;

  const senden = useCallback(
    async (text: string, leistungId?: string) => {
      const buerger: Eintrag = { id: uid(), rolle: "buerger", text };
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
          body: JSON.stringify({ nachrichten, leistungId, kontextLeistungId, lang }),
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
    [verlauf, kontextLeistungId, lang, t],
  );

  const neuesAnliegen = () => {
    setVerlauf([]);
    requestAnimationFrame(() => askRef.current?.focus());
  };

  const imGespraech = verlauf.length > 0;
  const letzteFrage = verlauf.map((e) => e.rolle).lastIndexOf("buerger");

  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout" initial={false}>
        {!imGespraech ? (
          <Hero
            key="hero"
            askRef={askRef}
            onSubmit={(text) => senden(text)}
            onLeistung={(id, label) => senden(label, id)}
            onLink={(href) => router.push(href)}
          />
        ) : (
          <motion.div key="gespraech" className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6">
            {/* Kopfzeile im Gespräch */}
            <div className="flex items-center justify-between gap-3 pb-6 pt-2">
              <div className="flex items-center gap-3">
                <motion.img layoutId="wappen" transition={spring} src={tenant.wappen} alt={tenant.wappenAlt} className="h-10 w-auto" />
                <motion.h1 layoutId="name" transition={spring} className="text-[19px] font-semibold tracking-[-0.02em]">
                  {tenant.name}
                </motion.h1>
              </div>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                type="button"
                onClick={neuesAnliegen}
                className="glass glass-interactive flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium"
              >
                <Icon name="refresh" className="size-4" />
                {t.neuesAnliegen}
              </motion.button>
            </div>

            <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-1 flex-col gap-8 pb-10">
              {verlauf.map((e, i) => {
                return (
                  <div key={e.id} ref={i === letzteFrage ? letzterRef : undefined} className="scroll-mt-24">
                    {e.rolle === "buerger" && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={spring}
                        className="flex justify-end"
                      >
                        <p className="max-w-[85%] whitespace-pre-wrap rounded-[22px] rounded-br-[8px] bg-[color-mix(in_srgb,var(--fg)_7%,transparent)] px-4 py-2.5 text-[16px] leading-relaxed">
                          <span className="sr-only">{t.sie}: </span>
                          {e.text}
                        </p>
                      </motion.div>
                    )}
                    {e.rolle === "assistent" && (
                      <AnswerBlock antwort={e.antwort} aktiv={!laedt && i === verlauf.length - 1} onOption={(id, label) => senden(label, id)} />
                    )}
                    {e.rolle === "fehler" && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="text-[15px] text-danger">
                        {e.text}
                      </motion.p>
                    )}
                  </div>
                );
              })}
              <AnimatePresence>{zeigeWarten && <Warten />}</AnimatePresence>
              <div ref={endeRef} />
            </div>

            {/* Angedocktes Eingabefeld (sticky, damit Impressum & Co. im Footer erreichbar bleiben) */}
            <div className="pointer-events-none sticky bottom-0 z-20 -mx-4 bg-gradient-to-t from-[var(--bg)] from-55% to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:-mx-6">
              <div className="pointer-events-auto px-4 sm:px-6">
                <AskField ref={askRef} size="dock" onSubmit={(text) => senden(text)} disabled={laedt} placeholder={tx(tenant.texte.platzhalter, lang)} describedBy="ki-hinweis-kurz" />
                <p id="ki-hinweis-kurz" className="mt-2 text-center text-[12px] text-subtle">
                  {lang === "de"
                    ? `Antworten beruhen auf Informationen der ${tenant.art} ${tenant.name}. Im Zweifel hilft Ihnen das Bürgerbüro.`
                    : `Answers are based on information from ${tenant.name}. If in doubt, the citizens' office will help.`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

// ---------------------------------------------------------------------------

function Hero({
  askRef,
  onSubmit,
  onLeistung,
  onLink,
}: {
  askRef: React.RefObject<AskFieldHandle | null>;
  onSubmit: (text: string) => void;
  onLeistung: (id: string, label: string) => void;
  onLink: (href: string) => void;
}) {
  const { tenant, lang, t } = useTenant();
  const aktive = new Set(tenant.leistungen.filter((l) => l.aktiv).map((l) => l.id));
  const aktionen = tenant.schnellaktionen.filter((s) => !s.leistungId || aktive.has(s.leistungId)).slice(0, 6);

  return (
    <motion.section
      variants={stagger(0.07, 0.05)}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      aria-labelledby="gemeinde-name"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 pb-10 pt-4 text-center sm:px-6 sm:pb-24"
    >
      <motion.img
        layoutId="wappen"
        transition={spring}
        variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: spring } }}
        src={tenant.wappen}
        alt={tenant.wappenAlt}
        className="h-[72px] w-auto drop-shadow-[0_8px_24px_rgb(0_0_0/0.12)] sm:h-[88px]"
      />
      <motion.h1
        id="gemeinde-name"
        layoutId="name"
        transition={spring}
        variants={fadeUp}
        className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[56px]"
      >
        {tenant.name}
      </motion.h1>
      <motion.p variants={fadeUp} className="mt-3 text-[17px] text-muted sm:text-[19px]">
        {tx(tenant.texte.untertitel, lang)}
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10 w-full sm:mt-12">
        <AskField ref={askRef} onSubmit={onSubmit} placeholder={tx(tenant.texte.platzhalter, lang)} describedBy="ki-hinweis" />
      </motion.div>

      {aktionen.length > 0 && (
        <motion.nav variants={fadeUp} aria-label={t.schnellaktionen} className="mt-6 w-full">
          <motion.ul variants={stagger(0.045, 0.1)} className="flex flex-wrap justify-center gap-2">
            {aktionen.map((a, i) => {
              const label = tx(a.label, lang);
              return (
                <motion.li key={i} variants={{ hidden: { opacity: 0, y: 6, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } }}>
                  <button
                    type="button"
                    onClick={() =>
                      a.href ? onLink(a.href) : a.leistungId ? onLeistung(a.leistungId, label) : onSubmit(tx(a.anfrage, lang) || label)
                    }
                    className="glass glass-interactive rounded-full px-4 py-2.5 text-[14px] font-medium text-fg/90 sm:text-[15px]"
                  >
                    {label}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.nav>
      )}

      <motion.p variants={fadeUp} id="ki-hinweis" className="mt-10 max-w-md text-[12.5px] leading-relaxed text-subtle">
        {t.kiHinweis} <KleinerLink href="/datenschutz#assistent">{t.kiHinweisMehr}</KleinerLink>
        {" · "}
        <KleinerLink href="/leistungen">{t.alleLeistungen}</KleinerLink>
      </motion.p>
    </motion.section>
  );
}
