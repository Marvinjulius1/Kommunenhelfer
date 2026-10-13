"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Antwort } from "@/lib/assistant/types";
import { useTenant } from "@/components/TenantProvider";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Markdown } from "@/components/ui/Markdown";
import { ButtonLink } from "@/components/ui/Button";
import { fadeUp, stagger } from "@/lib/client/motion";
import { LeistungDetails } from "./LeistungDetails";

interface Props {
  antwort: Antwort;
  onOption: (leistungId: string, label: string) => void;
  aktiv: boolean;
}

/** Eine Antwort des Bürgerservice: ruhig eingeblendet, ohne Avatar, ohne Tipp-Effekt. */
export function AnswerBlock({ antwort, onOption, aktiv }: Props) {
  const { tenant, t } = useTenant();
  const leistung = antwort.leistungId ? tenant.leistungen.find((l) => l.id === antwort.leistungId) : undefined;

  return (
    <motion.article variants={stagger(0.08)} initial="hidden" animate="show" className="space-y-4">
      <motion.p variants={fadeUp} className="text-[13px] font-medium text-subtle">
        {t.absender} {tenant.name}
      </motion.p>

      <motion.div variants={fadeUp}>
        <Markdown text={antwort.text} className="text-[17px] leading-[1.6] text-fg" />
      </motion.div>

      {leistung && (
        <motion.div variants={fadeUp}>
          <Glass className="rounded-[24px] p-5 sm:p-6">
            <LeistungDetails leistung={leistung} />
          </Glass>
        </motion.div>
      )}

      {antwort.optionen && antwort.optionen.length > 0 && (
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2" role="group" aria-label={antwort.text}>
          {antwort.optionen.map((o) => (
            <button
              key={o.leistungId}
              type="button"
              disabled={!aktiv}
              onClick={() => onOption(o.leistungId, o.label)}
              className="glass glass-interactive rounded-full px-4 py-2.5 text-[15px] font-medium disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
        </motion.div>
      )}

      {antwort.aktionen.length > 0 && (
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2.5 pt-1">
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
              case "link":
                return (
                  <ButtonLink key={i} href={a.url} variant="glass" external>
                    {a.label}
                    <Icon name="external" className="size-4" />
                  </ButtonLink>
                );
            }
          })}
        </motion.div>
      )}

      {antwort.quellen.length > 0 && (
        <motion.p variants={fadeUp} className="text-[13px] text-subtle">
          {t.quelle}: {antwort.quellen.join(" · ")}
        </motion.p>
      )}
    </motion.article>
  );
}

export function Warten() {
  const { t } = useTenant();
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.45, 0.9, 0.45] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      className="text-[15px] text-subtle"
      role="status"
    >
      {t.einenMoment}
    </motion.p>
  );
}

export function KleinerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-accent underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
