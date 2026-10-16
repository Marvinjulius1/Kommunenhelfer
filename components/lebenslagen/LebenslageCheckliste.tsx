"use client";

/**
 * Checkliste einer Lebenslage. Mit Bürgerkonto wird sie gespeichert und
 * erinnert vor Fristen; ohne Konto rechnet sie nur im Browser.
 */
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { plusTage } from "@/lib/feiertage";
import { einblenden, gestaffelt } from "@/lib/motion";

interface Schritt {
  id: string;
  titel: string;
  text?: string;
  href?: string;
  extern?: string;
}

interface Gespeichert {
  id: string;
  stichtag: string;
  schritte: { id: string; erledigt: boolean }[];
}

export function LebenslageCheckliste({
  lebenslageId,
  stichtagLabel,
  vorlage,
  relativ,
  gespeichert,
}: {
  lebenslageId: string;
  stichtagLabel: string;
  vorlage: Schritt[];
  relativ: Record<string, number>;
  gespeichert?: Gespeichert;
}) {
  const { lang, konto } = useTenant();
  const de = lang === "de";
  const [id, setId] = useState(gespeichert?.id);
  const [stichtag, setStichtag] = useState(gespeichert?.stichtag ?? "");
  const [erledigt, setErledigt] = useState<Set<string>>(new Set(gespeichert?.schritte.filter((s) => s.erledigt).map((s) => s.id)));
  const [meldung, setMeldung] = useState<string | null>(null);
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const fmt = (d: string) => new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

  const patch = async (body: object) => {
    if (!id) return;
    const r = await fetch(`/api/konto/checklisten/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) setMeldung(de ? "Das konnte nicht gespeichert werden." : "Could not be saved.");
  };

  const umschalten = (s: string) => {
    const neu = new Set(erledigt);
    const an = !neu.has(s);
    if (an) neu.add(s);
    else neu.delete(s);
    setErledigt(neu);
    void patch({ schritt: s, erledigt: an });
  };

  const speichern = async () => {
    setMeldung(null);
    const r = await fetch("/api/konto/checklisten", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lebenslageId, stichtag }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMeldung(de ? "Das konnte nicht gespeichert werden." : "Could not be saved.");
    setId(d.id);
    // bereits abgehakte Schritte übernehmen
    for (const s of erledigt) await fetch(`/api/konto/checklisten/${encodeURIComponent(d.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ schritt: s, erledigt: true }) });
    setMeldung(de ? "In Ihrem Konto gespeichert. Wir erinnern Sie vor jeder Frist." : "Saved to your account. We will remind you before each deadline.");
  };

  const fertig = vorlage.filter((s) => erledigt.has(s.id)).length;

  return (
    <div className="space-y-6">
      <Glass className="flex flex-wrap items-end justify-between gap-4 rounded-[24px] p-6">
        <label className="text-[14px] font-medium">
          {stichtagLabel}
          <input
            type="date"
            className="field-input mt-1"
            value={stichtag}
            onChange={(e) => {
              setStichtag(e.target.value);
              if (id && e.target.value) void patch({ stichtag: e.target.value });
            }}
          />
        </label>
        <p className="text-[14px] text-muted" aria-live="polite">
          {fertig} / {vorlage.length} {de ? "erledigt" : "done"}
        </p>
      </Glass>

      <motion.ol className="space-y-3" initial="hidden" animate="show" variants={gestaffelt(0.04)}>
        {vorlage.map((s, i) => {
          const frist = stichtag && relativ[s.id] !== undefined ? plusTage(stichtag, relativ[s.id]) : undefined;
          const ueberfaellig = frist && frist < heute && !erledigt.has(s.id);
          return (
            <motion.li key={s.id} variants={einblenden}>
              <Glass className="flex items-start gap-4 rounded-[24px] p-5">
                <input
                  id={`s-${s.id}`}
                  type="checkbox"
                  className="checkbox mt-1"
                  checked={erledigt.has(s.id)}
                  onChange={() => umschalten(s.id)}
                  aria-describedby={frist ? `f-${s.id}` : undefined}
                />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`s-${s.id}`} className={`block cursor-pointer text-[16px] font-medium ${erledigt.has(s.id) ? "text-subtle line-through" : ""}`}>
                    <span className="sr-only">{i + 1}. </span>
                    {s.titel}
                  </label>
                  {s.text && <p className="mt-1 text-[14px] leading-relaxed text-muted">{s.text}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                    {frist && (
                      <span id={`f-${s.id}`} className={ueberfaellig ? "font-medium text-danger" : "text-subtle"}>
                        {ueberfaellig ? (de ? "Frist überschritten: " : "Overdue: ") : de ? "bis " : "by "}
                        {fmt(frist)}
                      </span>
                    )}
                    {s.extern && <span className="text-subtle">{s.extern}</span>}
                    {s.href && (
                      <Link href={s.href} className="inline-flex items-center gap-1 font-medium text-accent underline underline-offset-4">
                        {de ? "Jetzt erledigen" : "Do it now"}
                        <Icon name="chevronRight" className="size-3.5" />
                      </Link>
                    )}
                  </p>
                </div>
              </Glass>
            </motion.li>
          );
        })}
      </motion.ol>

      {konto ? (
        !id && (
          <Button onClick={speichern} disabled={!stichtag}>
            {de ? "In meinem Konto speichern" : "Save to my account"}
          </Button>
        )
      ) : (
        <p className="text-[14px] text-muted">
          {de ? "Mit einem Bürgerkonto speichern wir die Liste für Sie und erinnern Sie vor jeder Frist. " : "With an account we save this list and remind you before each deadline. "}
          <Link href={`/konto/anmelden?weiter=/lebenslagen/${lebenslageId}`} className="font-medium text-accent underline underline-offset-4">
            {de ? "Anmelden oder Konto erstellen" : "Sign in or create an account"}
          </Link>
        </p>
      )}
      <p role="status" className="text-[14px] text-muted">
        {meldung}
      </p>
    </div>
  );
}
