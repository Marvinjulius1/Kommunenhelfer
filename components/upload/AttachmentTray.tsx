"use client";

/** Angehängte Dateien im Eingabefeld: Vorschau, Fortschritt, Entfernen, Erneut versuchen. */
import { AnimatePresence, motion } from "framer-motion";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import type { Anhang } from "@/lib/client/uploads";
import { feder } from "@/lib/motion";
import { FORMATE, formatGroesse } from "@/lib/uploads/formate";

export function Vorschau({ src, typ, className = "size-12" }: { src?: string; typ?: string | null; className?: string }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} shrink-0 rounded-[12px] object-cover`} />;
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-[12px] bg-[var(--line)] text-subtle`} aria-hidden="true">
      <span className="flex flex-col items-center gap-0.5">
        <Icon name="file" className="size-5" />
        <span className="text-[9px] font-semibold uppercase tracking-wide">{typ ? FORMATE[typ as keyof typeof FORMATE]?.label : ""}</span>
      </span>
    </span>
  );
}

export function AttachmentTray({ anhaenge, onEntfernen, onErneut }: { anhaenge: Anhang[]; onEntfernen: (id: string) => void; onErneut: (id: string) => void }) {
  const { lang } = useTenant();
  const de = lang === "de";
  if (!anhaenge.length) return null;
  return (
    <ul className="flex gap-2 overflow-x-auto px-2 pb-2 pt-2 [scrollbar-width:none]" aria-label={de ? "Angehängte Dateien" : "Attached files"}>
      <AnimatePresence initial={false} mode="popLayout">
        {anhaenge.map((a) => (
          <motion.li
            key={a.lokalId}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={feder.klein}
            className="flex w-60 shrink-0 items-center gap-2 rounded-[16px] bg-[var(--line)] p-2"
          >
            <Vorschau src={a.vorschau} typ={a.typ} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium" title={a.name}>
                {a.name}
              </p>
              {a.status === "laedt" && (
                <div
                  role="progressbar"
                  aria-label={de ? `${a.name} wird hochgeladen` : `Uploading ${a.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(a.fortschritt * 100)}
                  className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]"
                >
                  <div className="h-full origin-left rounded-full bg-fg/60 transition-transform duration-200" style={{ transform: `scaleX(${a.fortschritt})` }} />
                </div>
              )}
              {a.status === "fertig" && (
                <p className="flex items-center gap-1 text-[12px] text-subtle">
                  <Icon name="check" className="size-3.5" />
                  {formatGroesse(a.groesse, lang)}
                </p>
              )}
              {a.status === "fehler" && (
                <p className="line-clamp-2 text-[12px] leading-snug text-danger" title={a.fehler}>
                  {a.fehler}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col">
              {a.status === "fehler" && a.datei && (
                <button type="button" onClick={() => onErneut(a.lokalId)} aria-label={de ? `${a.name} erneut hochladen` : `Retry ${a.name}`} className="pressable grid size-8 place-items-center rounded-full text-muted hover:text-fg">
                  <Icon name="refresh" className="size-4" />
                </button>
              )}
              <button type="button" onClick={() => onEntfernen(a.lokalId)} aria-label={de ? `${a.name} entfernen` : `Remove ${a.name}`} className="pressable grid size-8 place-items-center rounded-full text-muted hover:text-fg">
                <Icon name="close" className="size-4" />
              </button>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
