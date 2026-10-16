"use client";

/**
 * "Meine Anliegen": Status aller Vorgänge und Termine dieses Geräts.
 * Abruf über Vorgangsnummer + Zugangscode (lokal gespeichert) – oder manuell.
 */
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { entferneAnliegen, ladeAnliegen, type LokalesAnliegen } from "@/lib/client/anliegen";
import { einblenden, gestaffelt } from "@/lib/motion";

interface Status {
  id: string;
  typ: "vorgang" | "termin" | "unbekannt";
  status?: string;
  amt?: string;
  slot?: string;
  dokumente?: number;
  nachrichten?: { von: "amt" | "buerger"; text: string; am: string }[];
}

const STUFEN = ["eingegangen", "in_bearbeitung", "erledigt"] as const;
const LABEL: Record<string, { de: string; en: string }> = {
  eingegangen: { de: "Eingegangen", en: "Received" },
  in_bearbeitung: { de: "In Bearbeitung", en: "In progress" },
  rueckfrage: { de: "Rückfrage", en: "Query" },
  erledigt: { de: "Erledigt", en: "Completed" },
  gebucht: { de: "Gebucht", en: "Booked" },
  storniert: { de: "Abgesagt", en: "Cancelled" },
};

export function MeineAnliegen() {
  const { lang, t, konto } = useTenant();
  const de = lang === "de";
  const [lokal, setLokal] = useState<LokalesAnliegen[] | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [laedt, setLaedt] = useState(false);

  /**
   * Quellen: (1) Konto – alle Anliegen geräteübergreifend, (2) dieses Gerät –
   * Vorgangsnummer + Zugangscode für Anliegen ohne Konto.
   */
  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const geraet = ladeAnliegen();
      let liste: LokalesAnliegen[] = [];
      const st: Record<string, Status> = {};
      if (konto) {
        const d = await fetch("/api/konto/anliegen").then((r) => r.json());
        for (const e of d.eintraege as (Status & { titel: string; erstelltAm: string })[]) {
          liste.push({ id: e.id, code: "", typ: e.typ === "termin" ? "termin" : "antrag", titel: e.titel, erstelltAm: e.erstelltAm });
          st[e.id] = e;
        }
      }
      const fehlend = geraet.filter((g) => !st[g.id]);
      liste = [...liste, ...fehlend].sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
      if (fehlend.length) {
        const d = await fetch("/api/anliegen", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eintraege: fehlend.map(({ id, code }) => ({ id, code })) }),
        }).then((r) => r.json());
        for (const e of d.eintraege as Status[]) st[e.id] = e;
      }
      setLokal(liste);
      setStatus(st);
    } catch {
      setLokal((l) => l ?? []);
    } finally {
      setLaedt(false);
    }
  }, [konto]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const absagen = async (a: LokalesAnliegen) => {
    if (!confirm(de ? "Möchten Sie diesen Termin wirklich absagen?" : "Do you really want to cancel this appointment?")) return;
    const res = await fetch("/api/termine", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: a.id, code: a.code || undefined }) });
    if (res.ok) void laden();
  };

  const entfernen = (id: string) => {
    entferneAnliegen(id);
    void laden();
  };

  const fmt = (iso: string) => new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { dateStyle: "medium" }).format(new Date(iso));
  const fmtSlot = (s: string) => {
    const [d, z] = s.split("T");
    return `${new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "long" }).format(new Date(d + "T12:00:00"))}, ${z}${de ? " Uhr" : ""}`;
  };

  if (lokal === null) return null;

  if (!lokal.length)
    return (
      <Glass className="rounded-[24px] p-8 text-center">
        <p className="text-[17px]">
          {konto ? (de ? "Sie haben noch keine Anliegen." : "You have no requests yet.") : de ? "Auf diesem Gerät sind noch keine Anliegen gespeichert." : "No requests are stored on this device yet."}
        </p>
        <p className="mt-2 text-[15px] text-muted">
          {de ? "Sobald Sie etwas einreichen oder einen Termin buchen, sehen Sie hier den aktuellen Stand." : "Once you submit something or book an appointment, you will see its status here."}
        </p>
        <div className="mt-6">
          <ButtonLink href="/">{t.startseite}</ButtonLink>
        </div>
      </Glass>
    );

  return (
    <motion.ul variants={gestaffelt(0.05)} initial="hidden" animate="show" className="space-y-4" aria-busy={laedt}>
      {lokal.map((a) => {
        const s = status[a.id];
        const st = s?.status ?? (laedt ? undefined : "unbekannt");
        const stufe = st === "rueckfrage" ? 1 : STUFEN.indexOf((st as (typeof STUFEN)[number]) ?? "eingegangen");
        return (
          <motion.li key={a.id} variants={einblenden}>
            <Glass className="rounded-[24px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] text-subtle">
                    <Icon name={a.typ === "termin" ? "calendar" : "doc"} className="size-4" />
                    {a.typ === "termin" ? (de ? "Termin" : "Appointment") : de ? "Vorgang" : "Request"} · {fmt(a.erstelltAm)}
                  </p>
                  <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{a.titel}</h2>
                  <p className="mt-1 font-mono text-[13px] text-subtle">{a.id}</p>
                  {s?.amt && <p className="mt-1 text-[13px] text-subtle">{s.amt}</p>}
                </div>
                {st && st !== "unbekannt" && (
                  <span
                    className={`rounded-full px-4 py-1 text-[13px] font-medium ${
                      st === "erledigt" || st === "gebucht" ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success" : "bg-[var(--line)] text-fg"
                    }`}
                  >
                    {LABEL[st]?.[lang] ?? st}
                  </span>
                )}
              </div>

              {s?.typ === "vorgang" && (
                <ol className="mt-6 grid grid-cols-3 gap-2" aria-label={de ? "Bearbeitungsstand" : "Progress"}>
                  {STUFEN.map((x, i) => (
                    <li key={x} className="text-[12px] text-subtle" aria-current={i === stufe ? "step" : undefined}>
                      <div className={`mb-2 h-1 rounded-full ${i <= stufe ? "bg-fg/70" : "bg-[var(--line)]"}`} />
                      <span className={i <= stufe ? "text-fg" : ""}>{LABEL[x][lang]}</span>
                    </li>
                  ))}
                </ol>
              )}

              {s?.typ === "vorgang" && !!s.nachrichten?.length && <Nachrichten eintrag={a} nachrichten={s.nachrichten} offen={st === "rueckfrage"} onGesendet={() => laden()} />}

              {s?.typ === "termin" && s.slot && <p className="mt-4 text-[15px]">{fmtSlot(s.slot)}</p>}

              {st === "unbekannt" && (
                <p className="mt-4 text-[14px] text-muted">
                  {de ? "Dieses Anliegen ist abgeschlossen und wurde nach Ablauf der Aufbewahrungsfrist gelöscht." : "This request has been completed and deleted after the retention period."}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {s?.typ === "termin" && s.status === "gebucht" && (
                  <Button variant="glass" className="!min-h-10 px-4 text-[14px]" onClick={() => absagen(a)}>
                    {de ? "Termin absagen" : "Cancel appointment"}
                  </Button>
                )}
                {a.code && (st === "unbekannt" || st === "storniert" || st === "erledigt") && (
                  <Button variant="quiet" className="!min-h-10 px-4 text-[14px]" onClick={() => entfernen(a.id)}>
                    {de ? "Aus der Liste entfernen" : "Remove from list"}
                  </Button>
                )}
              </div>
            </Glass>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function Nachrichten({
  eintrag,
  nachrichten,
  offen,
  onGesendet,
}: {
  eintrag: LokalesAnliegen;
  nachrichten: { von: "amt" | "buerger"; text: string; am: string }[];
  offen: boolean;
  onGesendet: () => void;
}) {
  const { lang } = useTenant();
  const de = lang === "de";
  const [text, setText] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const fid = `antwort-${eintrag.id}`;

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSendet(true);
    setFehler(null);
    try {
      const res = await fetch("/api/anliegen/antwort", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: eintrag.id, code: eintrag.code || undefined, text }),
      });
      if (!res.ok) throw new Error();
      setText("");
      onGesendet();
    } catch {
      setFehler(de ? "Ihre Antwort konnte nicht gesendet werden. Bitte versuchen Sie es erneut." : "Your reply could not be sent. Please try again.");
    } finally {
      setSendet(false);
    }
  };

  return (
    <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-6">
      {nachrichten.map((n, i) => (
        <div key={i} className={n.von === "amt" ? "" : "pl-8"}>
          <p className="text-[12px] text-subtle">
            {n.von === "amt" ? (de ? "Nachricht vom Amt" : "Message from the office") : de ? "Ihre Antwort" : "Your reply"} ·{" "}
            {new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(n.am))}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{n.text}</p>
        </div>
      ))}
      {offen && (
        <form onSubmit={senden} className="space-y-2">
          <label htmlFor={fid} className="text-[14px] font-medium">
            {de ? "Ihre Antwort" : "Your reply"}
          </label>
          <textarea id={fid} rows={3} className="field-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          {fehler && (
            <p role="alert" className="text-[14px] text-danger">
              {fehler}
            </p>
          )}
          <Button type="submit" disabled={sendet || !text.trim()} className="!min-h-10 px-4 text-[14px]">
            {sendet ? (de ? "Wird gesendet …" : "Sending …") : de ? "Antwort senden" : "Send reply"}
          </Button>
        </form>
      )}
    </div>
  );
}
