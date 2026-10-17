"use client";

/** Die eigene Wartenummer – Position und Aufruf, aktualisiert alle 15 Sekunden. */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { ladeTicket, TICKET_KEY } from "./Wartezeit";
import { deutsch } from "@/lib/i18n";

interface Position {
  nummer: string;
  amt: string;
  ort?: string;
  status: "wartend" | "aufgerufen" | "erledigt" | "nicht_erschienen" | "storniert";
  schalter?: string;
  vor: number;
  minuten: number;
}

export function WarteTicket({ id }: { id: string }) {
  const { lang } = useTenant();
  const de = deutsch(lang);
  const [p, setP] = useState<Position | null>(null);
  const [fehlt, setFehlt] = useState(false);
  const token = useRef<string | null>(null);

  useEffect(() => {
    const t = ladeTicket();
    token.current = t?.id === id ? t.token : new URLSearchParams(location.search).get("t");
    const laden = async () => {
      const r = await fetch(`/api/wartezeit/${encodeURIComponent(id)}${token.current ? `?t=${encodeURIComponent(token.current)}` : ""}`, { cache: "no-store" }).catch(() => null);
      if (!r?.ok) return setFehlt(true);
      const d: Position = await r.json();
      setP((alt) => {
        // Beim Aufruf kurz vibrieren (falls vom Gerät unterstützt)
        // Browser erlauben das erst nach einer Berührung der Seite
        const aktiv = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
        if (d.status === "aufgerufen" && alt?.status !== "aufgerufen" && aktiv) navigator.vibrate?.([200, 100, 200]);
        return d;
      });
    };
    void laden();
    const iv = setInterval(() => document.visibilityState === "visible" && laden(), 15_000);
    return () => clearInterval(iv);
  }, [id]);

  useEffect(() => {
    if (p) document.title = p.status === "aufgerufen" ? `${de ? "Sie sind dran" : "Your turn"} – ${p.nummer}` : `${p.nummer} · ${p.vor} ${de ? "vor Ihnen" : "ahead"}`;
  }, [p, de]);

  const zurueckgeben = async () => {
    await fetch(`/api/wartezeit/${encodeURIComponent(id)}${token.current ? `?t=${encodeURIComponent(token.current)}` : ""}`, { method: "DELETE" });
    try {
      localStorage.removeItem(TICKET_KEY);
    } catch {}
    setP((x) => (x ? { ...x, status: "storniert" } : x));
  };

  if (fehlt)
    return (
      <p className="text-[15px] text-muted">
        {de ? "Diese Wartenummer ist auf diesem Gerät nicht gespeichert. " : "This number is not stored on this device. "}
        <Link href="/wartezeit" className="underline underline-offset-4">
          {de ? "Zur Übersicht" : "Overview"}
        </Link>
      </p>
    );
  if (!p) return <p className="text-[15px] text-muted">{de ? "Wird geladen …" : "Loading …"}</p>;

  return (
    <div className="space-y-6" aria-live="polite">
      <Glass className="rounded-[32px] p-8 text-center">
        <p className="text-[14px] text-subtle">{p.amt}</p>
        <p className="mt-2 font-mono text-[64px] font-semibold leading-none tracking-tight">{p.nummer}</p>
        {p.status === "wartend" && (
          <>
            <p className="mt-6 text-[20px] font-semibold">{p.vor === 0 ? (de ? "Sie sind als Nächstes dran" : "You are next") : `${p.vor} ${de ? (p.vor === 1 ? "Person vor Ihnen" : "Personen vor Ihnen") : "ahead of you"}`}</p>
            <p className="mt-1 text-[15px] text-muted">{p.vor > 0 && (de ? `etwa ${p.minuten} Minuten` : `about ${p.minuten} minutes`)}</p>
          </>
        )}
        {p.status === "aufgerufen" && (
          <p className="mt-6 text-[24px] font-semibold text-accent">
            {de ? "Sie sind dran" : "It's your turn"}
            {p.schalter ? ` – ${p.schalter}` : ""}
          </p>
        )}
        {p.status === "erledigt" && <p className="mt-6 text-[18px] text-success">{de ? "Erledigt. Vielen Dank für Ihren Besuch!" : "Done. Thank you!"}</p>}
        {(p.status === "storniert" || p.status === "nicht_erschienen") && <p className="mt-6 text-[18px] text-muted">{de ? "Diese Nummer ist nicht mehr gültig." : "This number is no longer valid."}</p>}
        {p.ort && <p className="mt-6 text-[13px] text-subtle">{p.ort}</p>}
      </Glass>
      {p.status === "wartend" && (
        <div className="flex flex-wrap gap-3">
          <Button variant="glass" onClick={zurueckgeben}>
            {de ? "Ich komme doch nicht" : "I'm not coming"}
          </Button>
        </div>
      )}
      <p className="text-[13px] leading-relaxed text-subtle">
        {de ? "Lassen Sie diese Seite geöffnet – sie aktualisiert sich selbst. Mit Bürgerkonto und Benachrichtigungen erhalten Sie zusätzlich eine Nachricht, wenn Sie bald dran sind." : "Keep this page open – it updates automatically."}
      </p>
    </div>
  );
}
