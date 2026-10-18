"use client";

/** Zufriedenheit mit einem Klick (1–5), danach optional ein Satz. Anonym. */
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { aktiv } from "@/lib/funktionen";
import { deutsch } from "@/lib/i18n";
import { einblenden } from "@/lib/motion";

const STUFEN = {
  de: ["Sehr unzufrieden", "Unzufrieden", "Geht so", "Zufrieden", "Sehr zufrieden"],
  en: ["Very dissatisfied", "Dissatisfied", "Okay", "Satisfied", "Very satisfied"],
};

export function Zufriedenheit({
  anlass,
  leistungId,
  vorgang,
  frage,
  kompakt,
}: {
  anlass: "antrag" | "erledigt" | "termin" | "allgemein";
  leistungId?: string;
  vorgang?: { id: string; code?: string };
  frage?: string;
  kompakt?: boolean;
}) {
  const { tenant, lang } = useTenant();
  const de = deutsch(lang);
  const id = useId();
  const [note, setNote] = useState<number | null>(null);
  const [fid, setFid] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [fertig, setFertig] = useState(false);
  const [fehler, setFehler] = useState(false);
  if (!aktiv(tenant, "feedback")) return null;
  const stufen = STUFEN[de ? "de" : "en"];

  const bewerten = async (n: number) => {
    setNote(n);
    setFehler(false);
    const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: n, anlass, leistungId, vorgang }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setFid(d.id);
    else if (d.fehler === "schon_bewertet") setFertig(true);
    else {
      setNote(null);
      setFehler(true);
    }
  };

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fid && text.trim().length >= 2) await fetch("/api/feedback", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: fid, text }) });
    setFertig(true);
  };

  return (
    <div className={kompakt ? "" : "rounded-[24px] border border-[var(--line)] p-6 text-left"}>
      <AnimatePresence mode="wait" initial={false}>
        {note === null ? (
          <motion.fieldset key="frage" variants={einblenden} initial="hidden" animate="show" exit="hidden">
            <legend className="text-[15px] font-medium">{frage ?? (de ? "Wie zufrieden sind Sie mit dem Online-Antrag?" : "How satisfied are you with the online application?")}</legend>
            <div className="mt-3 flex gap-2" role="group">
              {stufen.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => bewerten(i + 1)}
                  title={s}
                  className="pressable grid size-11 place-items-center rounded-full border border-[var(--line)] text-[15px] font-medium tabular-nums hover:bg-[var(--line)]"
                >
                  {i + 1}
                  <span className="sr-only">: {s}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 flex max-w-[15.5rem] justify-between text-[12px] text-subtle" aria-hidden="true">
              <span>{stufen[0]}</span>
              <span>{stufen[4]}</span>
            </p>
            {fehler && (
              <p role="alert" className="mt-2 text-[13px] text-danger">
                {de ? "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal." : "That did not work. Please try again."}
              </p>
            )}
          </motion.fieldset>
        ) : fertig ? (
          <motion.p key="danke" variants={einblenden} initial="hidden" animate="show" role="status" className="text-[15px]">
            {de ? "Vielen Dank für Ihre Rückmeldung." : "Thank you for your feedback."}
          </motion.p>
        ) : (
          <motion.form key="text" variants={einblenden} initial="hidden" animate="show" onSubmit={senden} className="space-y-3">
            <p role="status" className="text-[15px] font-medium">
              {de ? "Danke!" : "Thank you!"} <span className="font-normal text-muted">({stufen[note - 1]})</span>
            </p>
            <label htmlFor={id} className="block text-[14px] text-muted">
              {note <= 3 ? (de ? "Was können wir besser machen? (freiwillig, bitte ohne persönliche Daten)" : "What could we do better? (optional, no personal data please)") : de ? "Möchten Sie uns noch etwas sagen? (freiwillig)" : "Anything else you would like to tell us? (optional)"}
            </label>
            <textarea id={id} rows={2} maxLength={1000} className="field-input" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" variant="glass" className="!min-h-10 px-4 text-[14px]">
                {text.trim() ? (de ? "Senden" : "Send") : de ? "Fertig" : "Done"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
