"use client";

import { motion } from "framer-motion";
import type { Antwort } from "@/lib/assistant/types";
import { useTenant } from "@/components/TenantProvider";
import { ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Markdown } from "@/components/ui/Markdown";
import { Einreichung, type EinreichungErgebnis } from "@/components/upload/Einreichung";
import { einblenden, gestaffelt } from "@/lib/motion";
import { LeistungDetails } from "./LeistungDetails";

interface Props {
  antwort: Antwort;
  onOption: (leistungId: string, label: string) => void;
  aktiv: boolean;
  vorschauen: Record<string, string | undefined>;
  nachricht: string;
  ergebnis?: EinreichungErgebnis;
  onAbgesendet: (e: EinreichungErgebnis) => void;
}

/** Eine Antwort des Bürgerservice: ruhig eingeblendet, ohne Avatar, ohne Tipp-Effekt. */
export function AnswerBlock({ antwort, onOption, aktiv, vorschauen, nachricht, ergebnis, onAbgesendet }: Props) {
  const { tenant, t } = useTenant();
  const leistung = antwort.leistungId ? tenant.leistungen.find((l) => l.id === antwort.leistungId) : undefined;

  return (
    <motion.article variants={gestaffelt(0.06)} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={einblenden}>
        <Markdown text={antwort.text} className="text-[17px] leading-[1.6] text-fg" />
      </motion.div>

      {leistung && (
        <motion.div variants={einblenden}>
          <Glass className="rounded-[24px] p-6">
            <LeistungDetails leistung={leistung} />
          </Glass>
        </motion.div>
      )}

      {antwort.einreichung && (
        <motion.div variants={einblenden}>
          <Einreichung daten={antwort.einreichung} vorschauen={vorschauen} nachricht={nachricht} aktiv={aktiv || !!ergebnis} ergebnis={ergebnis} onAbgesendet={onAbgesendet} />
        </motion.div>
      )}

      {antwort.optionen && antwort.optionen.length > 0 && (
        <motion.div variants={einblenden} className="flex flex-wrap gap-2" role="group" aria-label={antwort.text}>
          {antwort.optionen.map((o) => (
            <button
              key={o.leistungId}
              type="button"
              disabled={!aktiv}
              onClick={() => onOption(o.leistungId, o.label)}
              className="glass pressable min-h-12 rounded-full px-6 text-[15px] font-medium disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
        </motion.div>
      )}

      {antwort.aktionen.length > 0 && (
        <motion.div variants={einblenden} className="flex flex-wrap items-center gap-2">
          {antwort.aktionen.map((a, i) => {
            switch (a.typ) {
              case "antrag":
                return (
                  <ButtonLink key={i} href={`/antrag/${a.leistungId}`} variant="primary">
                    {a.label}
                    {a.hinweis && <span className="font-normal opacity-80">· {a.hinweis}</span>}
                    <Icon name="arrowRight" className="size-4" />
                  </ButtonLink>
                );
              case "termin":
                return (
                  <ButtonLink key={i} href={`/termine${a.leistungId ? `?leistung=${a.leistungId}` : ""}`} variant={i === 0 ? "primary" : "glass"}>
                    <Icon name="calendar" className="size-4" />
                    {a.label}
                  </ButtonLink>
                );
              case "kontakt":
                return (
                  <ButtonLink key={i} href="/kontakt" variant={i === 0 ? "primary" : "glass"}>
                    <Icon name="phone" className="size-4" />
                    {a.label}
                  </ButtonLink>
                );
              case "link": {
                const intern = a.url.startsWith("/");
                return (
                  <ButtonLink key={i} href={a.url} variant={intern && i === 0 ? "primary" : "glass"} external={!intern}>
                    {a.label}
                    <Icon name={intern ? "chevronRight" : "external"} className="size-4" />
                  </ButtonLink>
                );
              }
            }
          })}
        </motion.div>
      )}

      {antwort.quellen.length > 0 && (
        <motion.p variants={einblenden} className="text-[13px] text-subtle">
          {t.quelle}: {antwort.quellen.join(" · ")}
        </motion.p>
      )}
    </motion.article>
  );
}

/** Ruhiger Ladezustand: drei leise pulsierende Punkte. */
export function Denkt() {
  const { lang } = useTenant();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status">
      <span className="sr-only">{lang === "de" ? "Antwort wird erstellt" : "Preparing answer"}</span>
      <div className="denkt flex h-6 items-center gap-1.5" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </motion.div>
  );
}
