"use client";

/**
 * Bezahlseite. Im Testmodus wird die Zahlung simuliert; im Echtbetrieb
 * leitet der Anbieter (ePayBL des Landes) auf seine sichere Bezahlseite weiter.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

interface Zahlung {
  id: string;
  betragCent: number;
  zweck: string;
  status: "offen" | "bezahlt" | "abgebrochen";
  methode?: string;
  bezahltAm?: string;
  referenz?: string;
}

const METHODEN = [
  { id: "karte", label: "Kreditkarte", hinweis: "Visa, Mastercard" },
  { id: "paypal", label: "PayPal" },
  { id: "wallet", label: "Apple Pay / Google Pay" },
  { id: "wero", label: "Wero", hinweis: "Nachfolger von giropay" },
  { id: "lastschrift", label: "SEPA-Lastschrift" },
] as const;

const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export function Bezahlen({ id, testmodus }: { id: string; testmodus: boolean }) {
  const t = useSearchParams().get("t") ?? "";
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const [z, setZ] = useState<Zahlung | null | "fehlt">(null);
  const [methode, setMethode] = useState<string>("karte");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = () =>
    fetch(`/api/zahlung/${id}${q}`)
      .then((r) => (r.ok ? r.json() : "fehlt"))
      .then(setZ)
      .catch(() => setZ("fehlt"));
  useEffect(() => {
    void laden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (z === null) return <p className="text-[15px] text-subtle">Einen Moment bitte …</p>;
  if (z === "fehlt") return <Glass className="rounded-[24px] p-6 text-[15px]">Diese Zahlung wurde nicht gefunden oder der Link ist abgelaufen.</Glass>;

  if (z.status === "bezahlt")
    return (
      <Glass className="rounded-[24px] p-6 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-on-accent">
          <Icon name="check" className="size-8" />
        </span>
        <h2 className="mt-6 text-[24px] font-semibold tracking-[-0.02em]">Vielen Dank – bezahlt.</h2>
        <p className="mt-2 text-[15px] text-muted">
          {euro(z.betragCent)} · {z.zweck}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/bezahlen/${z.id}/quittung${q}`} className="glass pressable inline-flex min-h-12 items-center rounded-full px-6 text-[15px] font-medium">
            Quittung anzeigen
          </Link>
          <Link href="/meine-anliegen" className="pressable inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-[15px] font-medium text-on-accent">
            Meine Anliegen
          </Link>
        </div>
      </Glass>
    );

  return (
    <div className="space-y-4">
      <Glass className="rounded-[24px] p-6">
        <p className="text-[13px] text-subtle">Zu zahlen</p>
        <p className="mt-1 text-[40px] font-semibold tracking-[-0.03em] tabular-nums">{euro(z.betragCent)}</p>
        <p className="mt-1 text-[15px] text-muted">{z.zweck}</p>
      </Glass>
      <Glass className="rounded-[24px] p-6">
        <fieldset>
          <legend className="text-[15px] font-medium">Zahlungsart</legend>
          <div className="mt-4 grid gap-2">
            {METHODEN.map((m) => (
              <label key={m.id} className="choice">
                <input type="radio" className="radio" name="methode" value={m.id} checked={methode === m.id} onChange={() => setMethode(m.id)} />
                <span className="flex flex-col">
                  <span className="text-[15px]">{m.label}</span>
                  {"hinweis" in m && m.hinweis && <span className="text-[13px] text-subtle">{m.hinweis}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {testmodus && (
          <p className="mt-4 flex items-start gap-2 text-[13px] text-subtle">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
            Testmodus: Es wird kein Geld abgebucht. Im Echtbetrieb öffnet sich die sichere Bezahlseite der Bezahlplattform des Landes (ePayBL).
          </p>
        )}
        {fehler && (
          <p role="alert" className="mt-4 text-[14px] text-danger">
            {fehler}
          </p>
        )}
        <Button
          className="mt-6 w-full"
          disabled={laedt}
          onClick={async () => {
            setLaedt(true);
            setFehler(null);
            const res = await fetch(`/api/zahlung/${id}${q}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ methode }) });
            setLaedt(false);
            if (res.ok) void laden();
            else setFehler("Die Zahlung konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsart.");
          }}
        >
          {laedt ? "Zahlung wird ausgeführt …" : `${euro(z.betragCent)} jetzt bezahlen`}
        </Button>
        <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-subtle">
          <Icon name="lock" className="size-3.5" /> Verschlüsselte Übertragung
        </p>
      </Glass>
    </div>
  );
}
