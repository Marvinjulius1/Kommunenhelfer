"use client";

/**
 * Stadtkarte ohne Fremd-Bibliothek: Kacheln über den eigenen Server, Punkte als
 * Schaltflächen, Verschieben per Ziehen oder Pfeiltasten, Zoom per Knopf.
 * Alle Punkte stehen zusätzlich als Liste unter der Karte (barrierefrei).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { KACHEL, zuGrad, zuPixel } from "@/lib/karte";

export interface Punkt {
  id: string;
  name: string;
  ebene: string;
  lat: number;
  lng: number;
  text?: string;
  href?: string;
}

export interface Ebene {
  id: string;
  label: string;
  farbe: string;
  icon: IconName;
}

export function Stadtkarte({ mitte, zoom: startZoom, punkte, ebenen, start }: { mitte: [number, number]; zoom: number; punkte: Punkt[]; ebenen: Ebene[]; start?: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  // Erst im Browser messen und zeichnen – sonst weichen Server- und Browser-Ausgabe ab
  const [groesse, setGroesse] = useState<{ b: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(startZoom);
  const [zentrum, setZentrum] = useState({ lat: mitte[0], lng: mitte[1] });
  const [an, setAn] = useState<Set<string>>(new Set(start?.length ? start : ebenen.map((e) => e.id)));
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const zug = useRef<{ x: number; y: number; px: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setGroesse({ b: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const c = zuPixel(zentrum.lat, zentrum.lng, zoom);
  const b = groesse?.b ?? 0;
  const hoehe = groesse?.h ?? 0;
  const links = Math.round(c.x - b / 2);
  const oben = Math.round(c.y - hoehe / 2);
  const kacheln = useMemo(() => {
    const l: { x: number; y: number }[] = [];
    if (!b) return l;
    for (let x = Math.floor(links / KACHEL); x <= Math.floor((links + b) / KACHEL); x++) for (let y = Math.floor(oben / KACHEL); y <= Math.floor((oben + hoehe) / KACHEL); y++) l.push({ x, y });
    return l;
  }, [links, oben, b, hoehe]);

  const sichtbar = punkte.filter((p) => an.has(p.ebene));
  const aufKarte = groesse ? sichtbar : [];
  const ebene = (id: string) => ebenen.find((e) => e.id === id)!;
  const auswahl = punkte.find((p) => p.id === gewaehlt);

  const verschiebe = (dx: number, dy: number) => {
    const z = zuGrad(c.x + dx, c.y + dy, zoom);
    setZentrum(z);
  };

  return (
    <div>
      <div role="group" aria-label="Ebenen" className="mb-4 flex flex-wrap gap-2">
        {ebenen.map((e) => {
          const ein = an.has(e.id);
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={ein}
              onClick={() => setAn((s) => (s.has(e.id) ? new Set([...s].filter((x) => x !== e.id)) : new Set([...s, e.id])))}
              className={`pressable flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] ${ein ? "border-[var(--line)] bg-surface" : "border-transparent text-subtle"}`}
            >
              <span className="size-2.5 rounded-full" style={{ background: ein ? e.farbe : "transparent", boxShadow: `inset 0 0 0 1.5px ${e.farbe}` }} aria-hidden="true" />
              {e.label}
              <span className="text-subtle">{punkte.filter((p) => p.ebene === e.id).length}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={box}
        tabIndex={0}
        role="application"
        aria-label="Stadtkarte. Mit den Pfeiltasten verschieben, mit Plus und Minus zoomen. Alle Orte stehen auch in der Liste unter der Karte."
        className="relative h-[60vh] max-h-[560px] min-h-[340px] touch-none select-none overflow-hidden rounded-[24px] border border-[var(--line)] bg-[#e8ece9] outline-none focus-visible:ring-2 focus-visible:ring-accent dark:bg-[#1a1f1c]"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          zug.current = { x: e.clientX, y: e.clientY, px: c };
        }}
        onPointerMove={(e) => {
          const z = zug.current;
          if (!z) return;
          setZentrum(zuGrad(z.px.x - (e.clientX - z.x), z.px.y - (e.clientY - z.y), zoom));
        }}
        onPointerUp={() => (zug.current = null)}
        onKeyDown={(e) => {
          const s = 80;
          if (e.key === "ArrowLeft") verschiebe(-s, 0);
          else if (e.key === "ArrowRight") verschiebe(s, 0);
          else if (e.key === "ArrowUp") verschiebe(0, -s);
          else if (e.key === "ArrowDown") verschiebe(0, s);
          else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(18, z + 1));
          else if (e.key === "-") setZoom((z) => Math.max(12, z - 1));
          else if (e.key === "Escape") setGewaehlt(null);
          else return;
          e.preventDefault();
        }}
      >
        {kacheln.map((k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${zoom}/${k.x}/${k.y}`}
            src={`/api/karte/kachel/${zoom}/${k.x}/${k.y}`}
            alt=""
            width={KACHEL}
            height={KACHEL}
            draggable={false}
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")}
            className="pointer-events-none absolute max-w-none dark:brightness-[.7] dark:contrast-[1.1] dark:invert dark:hue-rotate-180"
            style={{ left: k.x * KACHEL - links, top: k.y * KACHEL - oben }}
          />
        ))}

        {aufKarte.map((p) => {
          const px = zuPixel(p.lat, p.lng, zoom);
          const e = ebene(p.ebene);
          const x = Math.round(px.x - links);
          const y = Math.round(px.y - oben);
          if (x < -20 || y < -20 || x > b + 20 || y > hoehe + 20) return null;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setGewaehlt(p.id)}
              aria-label={`${p.name} (${e.label})`}
              className={`absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-white shadow-md transition-transform ${gewaehlt === p.id ? "z-20 scale-125" : "z-10 hover:scale-110"}`}
              style={{ left: x, top: y, background: e.farbe }}
            >
              <Icon name={e.icon} className="size-4" />
            </button>
          );
        })}

        <div className="absolute end-3 top-3 z-30 flex flex-col overflow-hidden rounded-[14px] bg-surface shadow-md">
          <button type="button" aria-label="Hineinzoomen" onClick={() => setZoom((z) => Math.min(18, z + 1))} className="grid size-10 place-items-center text-[20px] hover:bg-[var(--line)]">
            +
          </button>
          <button type="button" aria-label="Herauszoomen" onClick={() => setZoom((z) => Math.max(12, z - 1))} className="grid size-10 place-items-center border-t border-[var(--line)] text-[20px] hover:bg-[var(--line)]">
            −
          </button>
        </div>

        {auswahl && (
          <div className="glass absolute inset-x-3 bottom-3 z-30 rounded-[18px] p-4 sm:inset-x-auto sm:start-3 sm:w-80" role="dialog" aria-label={auswahl.name}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] text-subtle">{ebene(auswahl.ebene).label}</p>
                <p className="text-[15px] font-semibold">{auswahl.name}</p>
              </div>
              <button type="button" aria-label="Schließen" onClick={() => setGewaehlt(null)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-[var(--line)]">
                <Icon name="close" className="size-4" />
              </button>
            </div>
            {auswahl.text && <p className="mt-1 text-[13px] text-muted">{auswahl.text}</p>}
            {auswahl.href && (
              <a href={auswahl.href} className="mt-2 inline-block text-[13px] font-medium text-accent underline underline-offset-2">
                Mehr erfahren
              </a>
            )}
          </div>
        )}

        <p className="absolute bottom-1 end-2 z-20 rounded bg-white/80 px-1.5 text-[10px] text-[#333]">
          ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>
          -Mitwirkende
        </p>
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-[15px] font-medium">Alle Orte als Liste ({sichtbar.length})</summary>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {sichtbar.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3 text-[14px]">
              <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: ebene(p.ebene).farbe }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{p.name}</span> <span className="text-subtle">· {ebene(p.ebene).label}</span>
                {p.text && <span className="block text-muted">{p.text}</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setZentrum({ lat: p.lat, lng: p.lng });
                  setZoom((z) => Math.max(z, 16));
                  setGewaehlt(p.id);
                  box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="shrink-0 text-[13px] text-accent underline underline-offset-2"
              >
                Auf der Karte<span className="sr-only">: {p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
