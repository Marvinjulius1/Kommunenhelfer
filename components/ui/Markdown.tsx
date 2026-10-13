/**
 * Minimaler, sicherer Markdown-Renderer (ohne innerHTML).
 * Unterstützt: Absätze, Listen (- / 1.), **fett**, Links (https://…) und E-Mail-Adressen.
 */
import { Fragment, type ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)|(https:\/\/[^\s)]*[^\s).,;:])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) out.push(<strong key={k}>{m[1].slice(2, -2)}</strong>);
    else if (m[2])
      out.push(
        <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
          {m[2].replace(/^https:\/\/(www\.)?/, "")}
        </a>,
      );
    else if (m[3])
      out.push(
        <a key={k} href={`mailto:${m[3]}`} className="text-accent underline underline-offset-2">
          {m[3]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const bloecke = text.trim().split(/\n{2,}/);
  return (
    <div className={`prose-calm ${className}`}>
      {bloecke.map((b, i) => {
        const zeilen = b.split("\n");
        if (zeilen.every((z) => /^\s*[-*]\s+/.test(z)))
          return (
            <ul key={i}>
              {zeilen.map((z, j) => (
                <li key={j}>{inline(z.replace(/^\s*[-*]\s+/, ""), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        if (zeilen.every((z) => /^\s*\d+\.\s+/.test(z)))
          return (
            <ol key={i}>
              {zeilen.map((z, j) => (
                <li key={j}>{inline(z.replace(/^\s*\d+\.\s+/, ""), `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        return (
          <p key={i}>
            {zeilen.map((z, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(z, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
