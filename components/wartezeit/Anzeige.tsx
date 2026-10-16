"use client";

/** Anzeigetafel für den Wartebereich (Bildschirm im Rathaus): aufgerufene Nummern groß. */
import { useEffect, useState } from "react";
import type { AmtStand } from "./Wartezeit";

export function Anzeige({ start, amtId }: { start: AmtStand[]; amtId?: string }) {
  const [aemter, setAemter] = useState(start);
  const [uhr, setUhr] = useState("");
  useEffect(() => {
    const tick = () => setUhr(new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date()));
    tick();
    const a = setInterval(async () => {
      const r = await fetch("/api/wartezeit", { cache: "no-store" }).catch(() => null);
      if (r?.ok) setAemter((await r.json()).aemter);
    }, 5000);
    const b = setInterval(tick, 30_000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);
  const liste = aemter.filter((a) => !amtId || a.amtId === amtId);
  return (
    <div className="grid min-h-dvh gap-8 bg-bg p-10" aria-live="polite">
      <p className="text-right font-mono text-[32px] text-subtle">{uhr}</p>
      {liste.map((a) => (
        <section key={a.amtId}>
          <h2 className="text-[36px] font-semibold">{a.name}</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {a.aufgerufen.length === 0 && <p className="text-[28px] text-subtle">Bitte warten Sie, bis Ihre Nummer erscheint.</p>}
            {[...a.aufgerufen].reverse().map((x, i) => (
              <div key={x.nummer} className={`rounded-[32px] p-8 ${i === 0 ? "bg-accent text-on-accent" : "glass"}`}>
                <p className="font-mono text-[72px] font-semibold leading-none">{`${a.amtId.slice(0, 1).toUpperCase()}${String(x.nummer).padStart(3, "0")}`}</p>
                <p className="mt-3 text-[28px]">{x.schalter}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[24px] text-muted">
            {a.wartend} wartend · ca. {a.minuten} Minuten
          </p>
        </section>
      ))}
    </div>
  );
}
