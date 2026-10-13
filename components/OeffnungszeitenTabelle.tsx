import type { Sprache, Wochenplan } from "@/config/types";
import { dict, WOCHENTAGE } from "@/lib/i18n";

export function OeffnungszeitenTabelle({ plan, lang }: { plan: Wochenplan; lang: Sprache }) {
  const tage = ["mo", "di", "mi", "do", "fr", "sa", "so"] as const;
  return (
    <table className="w-full text-[15px]">
      <caption className="sr-only">{dict(lang).oeffnungszeiten}</caption>
      <tbody>
        {tage
          .filter((t) => plan[t] || (t !== "sa" && t !== "so"))
          .map((t) => (
            <tr key={t} className="border-b border-[var(--line)] last:border-0">
              <th scope="row" className="py-2 pr-4 text-left font-normal text-muted">
                {WOCHENTAGE[lang][t]}
              </th>
              <td className="py-2 text-right tabular-nums">
                {plan[t]?.map(([v, b]) => `${v}–${b}`).join(", ") ?? <span className="text-subtle">{dict(lang).geschlossen}</span>}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
