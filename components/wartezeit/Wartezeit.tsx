"use client";

/** Live-Wartezeit der Ämter und Wartenummer ziehen. Aktualisiert sich alle 30 Sekunden. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

export interface AmtStand {
  amtId: string;
  name: string;
  geoeffnet: boolean;
  wartend: number;
  minuten: number;
  aufgerufen: { nummer: number; schalter?: string }[];
}

export const TICKET_KEY = "wartenummer.v1";
export interface Ticket {
  id: string;
  token: string;
  amtId: string;
  datum: string;
}

export function ladeTicket(): Ticket | null {
  try {
    const t = JSON.parse(localStorage.getItem(TICKET_KEY) || "null") as Ticket | null;
    return t && t.datum === new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }) ? t : null;
  } catch {
    return null;
  }
}

export function Wartezeit({ start, demo }: { start: AmtStand[]; demo: boolean }) {
  const { lang } = useTenant();
  const de = lang === "de";
  const router = useRouter();
  const [aemter, setAemter] = useState(start);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState<string | null>(null);

  const aktualisieren = useCallback(async () => {
    const r = await fetch("/api/wartezeit", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setAemter((await r.json()).aemter);
  }, []);

  useEffect(() => {
    setTicket(ladeTicket());
    const t = setInterval(() => document.visibilityState === "visible" && aktualisieren(), 30_000);
    return () => clearInterval(t);
  }, [aktualisieren]);

  const ziehen = async (amtId: string) => {
    setFehler(null);
    setLaedt(amtId);
    const r = await fetch("/api/wartezeit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amtId }) });
    setLaedt(null);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setFehler(
        r.status === 409
          ? de
            ? "Wartenummern gibt es nur während der Öffnungszeiten."
            : "Numbers are only available during opening hours."
          : r.status === 429
            ? de
              ? "Sie haben bereits mehrere Nummern gezogen. Bitte warten Sie etwas."
              : "You have already taken several numbers."
            : de
              ? "Das hat nicht geklappt."
              : "That did not work.",
      );
      return;
    }
    const t: Ticket = { id: d.id, token: d.token, amtId, datum: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }) };
    try {
      localStorage.setItem(TICKET_KEY, JSON.stringify(t));
    } catch {}
    router.push(`/wartezeit/${d.id}`);
  };

  return (
    <div className="space-y-4">
      {ticket && (
        <Link href={`/wartezeit/${ticket.id}`} className="glass pressable flex items-center justify-between gap-4 rounded-[24px] p-5">
          <span className="flex items-center gap-3 text-[16px] font-semibold">
            <Icon name="ticket" className="size-5" />
            {de ? "Ihre Wartenummer anzeigen" : "Show your number"}
          </span>
          <Icon name="chevronRight" className="size-4 text-subtle" />
        </Link>
      )}
      {aemter.map((a) => (
        <Glass key={a.amtId} className="rounded-[24px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-semibold">{a.name}</h2>
              <p className={`mt-1 text-[14px] ${a.geoeffnet ? "text-success" : "text-subtle"}`}>{a.geoeffnet ? (de ? "Jetzt geöffnet" : "Open now") : de ? "Geschlossen" : "Closed"}</p>
            </div>
            <div className="text-right">
              <p className="text-[28px] font-semibold tabular-nums tracking-tight">{a.wartend === 0 ? (de ? "keine" : "none") : `~${a.minuten} min`}</p>
              <p className="text-[13px] text-subtle">
                {a.wartend} {de ? (a.wartend === 1 ? "Person wartet" : "Personen warten") : "waiting"}
              </p>
            </div>
          </div>
          {(a.geoeffnet || demo) && !ticket && (
            <Button variant="glass" className="mt-5" onClick={() => ziehen(a.amtId)} disabled={laedt === a.amtId}>
              <Icon name="ticket" className="size-4" />
              {de ? "Wartenummer ziehen" : "Take a number"}
            </Button>
          )}
        </Glass>
      ))}
      <p role="status" className="text-[14px] text-danger">
        {fehler}
      </p>
      <p className="text-[13px] leading-relaxed text-subtle">
        {de
          ? "Ziehen Sie die Nummer, wenn Sie sich auf den Weg machen. Die Wartezeit ist eine Schätzung aus den heutigen Bearbeitungszeiten. Mit Termin geht es immer schneller."
          : "Take a number when you set off. The waiting time is an estimate. With an appointment it is always faster."}{" "}
        <Link href="/termine" className="underline underline-offset-4">
          {de ? "Termin buchen" : "Book an appointment"}
        </Link>
      </p>
    </div>
  );
}
