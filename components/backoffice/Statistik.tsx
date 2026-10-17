"use client";

/**
 * Statistik-Diagramme (inline SVG, ohne Bibliothek).
 * Linien: Vorgänge und Termine pro Tag – eine Achse, Legende, Endbeschriftung,
 * Fadenkreuz mit Tooltip, Tabellenansicht. Balken: häufigste Leistungen.
 */
import { useEffect, useRef, useState } from "react";

export interface Tag {
  datum: string;
  vorgaenge: number;
  termine: number;
}

const H = 220;
const R = { l: 32, r: 72, o: 12, u: 26 };
const fmtTag = (d: string) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(d + "T12:00:00Z"));

function schoeneSkala(max: number) {
  const roh = Math.max(4, max);
  const schritt = Math.pow(10, Math.floor(Math.log10(roh / 4)));
  const s =
    [1, 2, 5, 10].map((f) => f * schritt).find((x) => roh / x <= 5) ??
    schritt * 10;
  return { max: Math.ceil(roh / s) * s, schritt: s };
}

export function Verlauf({ tage }: { tage: Tag[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const rahmen = useRef<HTMLDivElement>(null);
  // In echter Breite zeichnen (statt zu skalieren), damit die Schrift lesbar bleibt
  const [B, setB] = useState(0);
  useEffect(() => {
    const el = rahmen.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setB(Math.max(260, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const serien = [
    { key: "vorgaenge" as const, label: "Vorgänge", farbe: "var(--series-1)" },
    { key: "termine" as const, label: "Termine", farbe: "var(--series-2)" },
  ];
  const { max, schritt } = schoeneSkala(
    Math.max(...tage.flatMap((t) => [t.vorgaenge, t.termine])),
  );
  const x = (i: number) =>
    R.l + (tage.length <= 1 ? 0 : (i / (tage.length - 1)) * (B - R.l - R.r));
  const y = (v: number) => R.o + (1 - v / max) * (H - R.o - R.u);
  const pfade = serien.map((s) => tage.map((t, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(t[s.key]).toFixed(1)}`).join(""));
  const ticks = Array.from(
    { length: Math.round(max / schritt) + 1 },
    (_, i) => i * schritt,
  );
  const labelIdx = [
    0,
    Math.floor((tage.length - 1) / 2),
    tage.length - 1,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const bewegen = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * B;
    const i = Math.round(((px - R.l) / (B - R.l - R.r)) * (tage.length - 1));
    setHover(Math.max(0, Math.min(tage.length - 1, i)));
  };

  // Endbeschriftungen: bei Überlappung auseinanderschieben
  const enden = serien.map((s) => ({
    ...s,
    y: y(tage.at(-1)?.[s.key] ?? 0),
    wert: tage.at(-1)?.[s.key] ?? 0,
  }));
  if (Math.abs(enden[0].y - enden[1].y) < 14) {
    const mitte = (enden[0].y + enden[1].y) / 2;
    const oben = enden[0].y <= enden[1].y ? 0 : 1;
    enden[oben].y = mitte - 7;
    enden[1 - oben].y = mitte + 7;
  }

  const h = hover !== null ? tage[hover] : null;
  return (
    <figure className="viz">
      <div
        className="mb-3 flex flex-wrap gap-4 text-[13px] text-muted"
        aria-hidden="true"
      >
        {serien.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: s.farbe }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <div
        className="relative w-full min-w-0"
        ref={rahmen}
        style={{ minHeight: H }}
      >
        {B > 0 && (
          <svg
            ref={svg}
            viewBox={`0 0 ${B} ${H}`}
            width={B}
            height={H}
            className="block touch-none select-none"
            role="img"
            aria-label={`Vorgänge und Termine pro Tag, ${fmtTag(tage[0]?.datum ?? "")} bis ${fmtTag(tage.at(-1)?.datum ?? "")}. Details in der Tabelle darunter.`}
            onPointerMove={bewegen}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={R.l}
                  x2={B - R.r}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
                <text
                  x={R.l - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-[var(--fg-subtle)] text-[11px] tabular-nums"
                >
                  {t}
                </text>
              </g>
            ))}
            {labelIdx.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={H - 6}
                textAnchor={
                  i === 0 ? "start" : i === tage.length - 1 ? "end" : "middle"
                }
                className="fill-[var(--fg-subtle)] text-[11px]"
              >
                {fmtTag(tage[i].datum)}
              </text>
            ))}
            {serien.map((s, k) => (
              <path
                key={s.key}
                d={pfade[k]}
                fill="none"
                stroke={s.farbe}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {enden.map((s) => (
              <text
                key={s.key}
                x={B - R.r + 8}
                y={s.y}
                dy="0.32em"
                className="fill-[var(--fg-muted)] text-[11px]"
              >
                {s.label} {s.wert}
              </text>
            ))}
            {hover !== null && (
              <g>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={R.o}
                  y2={H - R.u}
                  stroke="var(--fg-subtle)"
                  strokeWidth={1}
                />
                {serien.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(hover)}
                    cy={y(tage[hover][s.key])}
                    r={4}
                    fill={s.farbe}
                    stroke="var(--bg)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>
        )}
        {h && hover !== null && B > 0 && (
          <div
            className="glass pointer-events-none absolute top-0 z-10 rounded-[12px] px-3 py-2 text-[12px] shadow-sm"
            style={{
              left: `${(x(hover) / B) * 100}%`,
              transform: `translateX(${hover > tage.length / 2 ? "-105%" : "5%"})`,
            }}
          >
            <p className="font-medium">{fmtTag(h.datum)}</p>
            {serien.map((s) => (
              <p key={s.key} className="flex items-center gap-2 text-muted">
                <span
                  className="size-2 rounded-full"
                  style={{ background: s.farbe }}
                />
                {s.label}:{" "}
                <span className="tabular-nums text-fg">{h[s.key]}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-muted">
          Als Tabelle anzeigen
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-subtle">
            <tr>
              <th className="py-1 font-normal">Tag</th>
              <th className="py-1 text-right font-normal">Vorgänge</th>
              <th className="py-1 text-right font-normal">Termine</th>
            </tr>
          </thead>
          <tbody>
            {tage.map((t) => (
              <tr key={t.datum} className="border-t border-[var(--line)]">
                <td className="py-1">{fmtTag(t.datum)}</td>
                <td className="py-1 text-right">{t.vorgaenge}</td>
                <td className="py-1 text-right">{t.termine}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function TopLeistungen({
  liste,
}: {
  liste: { titel: string; anzahl: number }[];
}) {
  const max = Math.max(1, ...liste.map((l) => l.anzahl));
  if (!liste.length)
    return <p className="text-[14px] text-muted">Noch keine Daten.</p>;
  return (
    <ul className="viz space-y-3">
      {liste.map((l) => (
        <li key={l.titel} title={`${l.titel}: ${l.anzahl}`}>
          <div className="flex justify-between gap-4 text-[13px]">
            <span className="truncate">{l.titel}</span>
            <span className="tabular-nums text-muted">{l.anzahl}</span>
          </div>
          <div className="mt-1 h-2" aria-hidden="true">
            <div
              className="h-full origin-left rounded-r-[4px]"
              style={{
                width: `${Math.max(2, (l.anzahl / max) * 100)}%`,
                background: "var(--series-1)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
