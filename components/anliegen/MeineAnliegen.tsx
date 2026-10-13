"use client";

/** "Meine Anliegen": Status aller Anträge und Termine, die auf diesem Gerät gestellt wurden. */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { entferneAnliegen, ladeAnliegen, type LokalesAnliegen } from "@/lib/client/anliegen";
import { fadeUp, stagger } from "@/lib/client/motion";

interface Status {
  id: string;
  typ: "antrag" | "termin" | "unbekannt";
  status?: string;
  slot?: string;
  verlauf?: { status: string; am: string }[];
}

const STUFEN = ["eingegangen", "in_bearbeitung", "abgeschlossen"] as const;
const LABEL: Record<string, { de: string; en: string }> = {
  eingegangen: { de: "Eingegangen", en: "Received" },
  in_bearbeitung: { de: "In Bearbeitung", en: "In progress" },
  rueckfrage: { de: "Rückfrage – wir melden uns", en: "Query – we will contact you" },
  abgeschlossen: { de: "Abgeschlossen", en: "Completed" },
  gebucht: { de: "Gebucht", en: "Booked" },
  storniert: { de: "Abgesagt", en: "Cancelled" },
};

export function MeineAnliegen() {
  const { lang, t } = useTenant();
  const de = lang === "de";
  const [lokal, setLokal] = useState<LokalesAnliegen[] | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [laedt, setLaedt] = useState(false);

  const laden = async (eintraege: LokalesAnliegen[]) => {
    if (!eintraege.length) return;
    setLaedt(true);
    try {
      const res = await fetch("/api/anliegen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eintraege: eintraege.map(({ id, code }) => ({ id, code })) }),
      });
      const d = await res.json();
      setStatus(Object.fromEntries((d.eintraege as Status[]).map((s) => [s.id, s])));
    } finally {
      setLaedt(false);
    }
  };

  useEffect(() => {
    const l = ladeAnliegen();
    setLokal(l);
    laden(l);
  }, []);

  const absagen = async (a: LokalesAnliegen) => {
    if (!confirm(de ? "Möchten Sie diesen Termin wirklich absagen?" : "Do you really want to cancel this appointment?")) return;
    const res = await fetch("/api/termine", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: a.id, code: a.code }) });
    if (res.ok) laden(lokal ?? []);
  };

  const entfernen = (id: string) => {
    entferneAnliegen(id);
    setLokal(ladeAnliegen());
  };

  const fmt = (iso: string) => new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { dateStyle: "medium" }).format(new Date(iso));
  const fmtSlot = (s: string) => {
    const [d, z] = s.split("T");
    return `${new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "long" }).format(new Date(d + "T12:00:00"))}, ${z}${de ? " Uhr" : ""}`;
  };

  if (lokal === null) return null;

  if (!lokal.length)
    return (
      <Glass className="rounded-[26px] p-8 text-center">
        <p className="text-[17px]">{de ? "Auf diesem Gerät sind noch keine Anliegen gespeichert." : "No requests are stored on this device yet."}</p>
        <p className="mt-2 text-[15px] text-muted">
          {de ? "Sobald Sie einen Antrag stellen oder einen Termin buchen, sehen Sie hier den aktuellen Stand." : "Once you submit an application or book an appointment, you will see its status here."}
        </p>
        <div className="mt-6">
          <ButtonLink href="/">{t.startseite}</ButtonLink>
        </div>
      </Glass>
    );

  return (
    <motion.ul variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-4" aria-busy={laedt}>
      {lokal.map((a) => {
        const s = status[a.id];
        const st = s?.status ?? (laedt ? undefined : "unbekannt");
        const stufe = STUFEN.indexOf((st as (typeof STUFEN)[number]) ?? "eingegangen");
        return (
          <motion.li key={a.id} variants={fadeUp}>
            <Glass className="rounded-[24px] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] text-subtle">
                    <Icon name={a.typ === "termin" ? "calendar" : "doc"} className="size-4" />
                    {a.typ === "termin" ? (de ? "Termin" : "Appointment") : de ? "Antrag" : "Application"} · {fmt(a.erstelltAm)}
                  </p>
                  <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">{a.titel}</h2>
                  <p className="mt-0.5 font-mono text-[13px] text-subtle">{a.id}</p>
                </div>
                {st && st !== "unbekannt" && (
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                      st === "abgeschlossen" || st === "gebucht"
                        ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success"
                        : st === "storniert"
                          ? "bg-[var(--line)] text-muted"
                          : "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-accent"
                    }`}
                  >
                    {LABEL[st]?.[lang] ?? st}
                  </span>
                )}
              </div>

              {s?.typ === "antrag" && (
                <ol className="mt-5 grid grid-cols-3 gap-2" aria-label={de ? "Bearbeitungsstand" : "Progress"}>
                  {STUFEN.map((x, i) => (
                    <li key={x} className="text-[12px] text-subtle" aria-current={i === stufe ? "step" : undefined}>
                      <div className={`mb-2 h-1 rounded-full ${i <= stufe ? "bg-accent" : "bg-[var(--line)]"}`} />
                      <span className={i <= stufe ? "text-fg" : ""}>{LABEL[x][lang]}</span>
                    </li>
                  ))}
                </ol>
              )}

              {s?.typ === "termin" && s.slot && <p className="mt-4 text-[15px]">{fmtSlot(s.slot)}</p>}

              {st === "unbekannt" && (
                <p className="mt-3 text-[14px] text-muted">
                  {de ? "Dieses Anliegen ist abgeschlossen und wurde gemäß Löschfrist entfernt." : "This request has been completed and deleted after the retention period."}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {s?.typ === "termin" && s.status === "gebucht" && (
                  <Button variant="glass" className="min-h-9 px-4 text-[14px]" onClick={() => absagen(a)}>
                    {de ? "Termin absagen" : "Cancel appointment"}
                  </Button>
                )}
                {(st === "unbekannt" || st === "storniert" || st === "abgeschlossen") && (
                  <Button variant="quiet" className="min-h-9 px-4 text-[14px]" onClick={() => entfernen(a.id)}>
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
