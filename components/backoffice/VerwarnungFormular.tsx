"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function VerwarnungFormular() {
  const router = useRouter();
  const [meldung, setMeldung] = useState<string | null>(null);
  const feld = "field-input mt-1 !min-h-10 !py-2 text-[14px]";
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await fetch("/api/backoffice/parken", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ aktenzeichen: f.get("az"), kennzeichen: f.get("kz"), betrag: Number(String(f.get("betrag")).replace(",", ".")), tatbestand: f.get("tatbestand"), tatzeit: f.get("tatzeit"), tatort: f.get("tatort") }),
        });
        setMeldung(r.ok ? "Erfasst." : r.status === 409 ? "Diesen Fall gibt es schon." : "Bitte Angaben prüfen.");
        if (r.ok) {
          e.currentTarget.reset();
          router.refresh();
        }
      }}
    >
      <label className="block text-[13px] font-medium">
        Aktenzeichen
        <input name="az" required className={`${feld} font-mono uppercase`} />
      </label>
      <label className="block text-[13px] font-medium">
        Kennzeichen
        <input name="kz" required className={`${feld} font-mono uppercase`} />
      </label>
      <label className="block text-[13px] font-medium sm:col-span-2">
        Tatbestand
        <input name="tatbestand" required className={feld} list="tb" />
        <datalist id="tb">
          <option value="Parken im eingeschränkten Halteverbot" />
          <option value="Parken ohne gültigen Parkschein" />
          <option value="Parken auf dem Gehweg" />
          <option value="Parken im Bewohnerparkbereich ohne Ausweis" />
        </datalist>
      </label>
      <label className="block text-[13px] font-medium">
        Tatzeit
        <input name="tatzeit" type="datetime-local" required className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Betrag (€)
        <input name="betrag" inputMode="decimal" required className={feld} />
      </label>
      <label className="block text-[13px] font-medium sm:col-span-2">
        Tatort
        <input name="tatort" required className={feld} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" className="!min-h-10 px-5 text-[14px]">
          Erfassen
        </Button>
        <p role="status" className="text-[13px] text-muted">
          {meldung}
        </p>
      </div>
    </form>
  );
}
