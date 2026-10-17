"use client";

/** Kurzer Datenschutzhinweis mit Einwilligung – vor dem ersten Upload. */
import Link from "next/link";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "./Sheet";
import { deutsch } from "@/lib/i18n";

export function ConsentSheet({ offen, onJa, onNein }: { offen: boolean; onJa: () => void; onNein: () => void }) {
  const { tenant, lang } = useTenant();
  const de = deutsch(lang);
  return (
    <Sheet offen={offen} onClose={onNein} titel={de ? "Hinweis zum Datenschutz" : "Privacy notice"}>
      <div className="mb-4 grid size-10 place-items-center rounded-full bg-[var(--line)] text-muted">
        <Icon name="shield" className="size-5" />
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{de ? "Bevor Sie Unterlagen senden" : "Before you send documents"}</h2>
      <ul className="prose-calm mt-4 text-[15px] leading-relaxed text-muted">
        {de ? (
          <>
            <li>Ihre Dateien werden verschlüsselt übertragen und verschlüsselt in der EU gespeichert.</li>
            <li>Ein KI-System sortiert die Unterlagen vor und schlägt die zuständige Stelle vor. Entscheiden wird immer ein Mensch im Amt.</li>
            <li>Ihre Unterlagen werden nicht zum Training von KI-Modellen verwendet.</li>
            <li>Nicht abgesendete Dateien löschen wir nach 24 Stunden, eingereichte nach Ablauf der Aufbewahrungsfrist.</li>
          </>
        ) : (
          <>
            <li>Your files are transmitted and stored encrypted in the EU.</li>
            <li>An AI system pre-sorts the documents and suggests the responsible office. A person at the office always decides.</li>
            <li>Your documents are not used to train AI models.</li>
            <li>Files not sent are deleted after 24 hours; submitted files after the retention period.</li>
          </>
        )}
      </ul>
      <p className="mt-4 text-[13px] text-subtle">
        {de ? `Verantwortlich: ${tenant.art} ${tenant.name}. ` : `Controller: ${tenant.name}. `}
        <Link href="/datenschutz#uploads" target="_blank" className="text-accent underline underline-offset-2">
          {de ? "Datenschutzhinweise" : "Privacy notice"}
        </Link>
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="glass" onClick={onNein}>
          {de ? "Abbrechen" : "Cancel"}
        </Button>
        <Button onClick={onJa}>{de ? "Einverstanden" : "I agree"}</Button>
      </div>
    </Sheet>
  );
}
