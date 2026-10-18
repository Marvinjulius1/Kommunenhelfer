import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { deutsch } from "@/lib/i18n";
import { getLang, getTenant } from "@/lib/tenant";
import { anmeldungen, belegt, veranstaltungen } from "@/lib/veranstaltungen/service";

export const metadata: Metadata = { title: "Veranstaltungen" };
export const dynamic = "force-dynamic";

const tag = (d: string) => new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d.slice(0, 10) + "T12:00:00Z"));
const monat = (d: string) => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d.slice(0, 10) + "T12:00:00Z"));

export default async function VeranstaltungenSeite({ searchParams }: { searchParams: Promise<{ art?: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "veranstaltungen")) notFound();
  const de = deutsch(await getLang(tenant));
  const { art = "" } = await searchParams;
  const alle = await veranstaltungen(tenant);
  const liste = alle.filter((v) => (art === "ferien" ? v.ferienprogramm : art ? v.kategorie === art : true));
  const kategorien = [...new Set(alle.filter((v) => !v.ferienprogramm).map((v) => v.kategorie))];
  const frei = new Map(await Promise.all(liste.filter((v) => v.anmeldung && v.plaetze).map(async (v) => [v.id, v.plaetze! - belegt(await anmeldungen(tenant, v.id))] as const)));
  const monate = [...new Set(liste.map((v) => monat(v.beginn)))];

  return (
    <Page titel={de ? "Veranstaltungen" : "Events"} intro={de ? "Feste, Kurse, Führungen und das Ferienprogramm – mit Anmeldung direkt hier." : "Festivals, courses, tours and the holiday programme."} breit>
      <nav aria-label="Auswahl" className="flex flex-wrap gap-2 text-[14px]">
        {[["", "Alle"], ["ferien", "Ferienprogramm"], ...kategorien.map((k) => [k, k])].map(([k, l]) => (
          <Link key={k || "alle"} href={k ? `/veranstaltungen?art=${encodeURIComponent(k)}` : "/veranstaltungen"} aria-current={art === k ? "page" : undefined} className={`rounded-full px-4 py-1.5 ${art === k ? "bg-fg text-bg" : "bg-[var(--line)]"}`}>
            {l}
          </Link>
        ))}
        <Link href="/vereine" className="ms-auto rounded-full px-4 py-1.5 text-accent underline underline-offset-4">
          Vereine
        </Link>
        {aktiv(tenant, "ehrenamt") && (
          <Link href="/ehrenamt" className="rounded-full px-4 py-1.5 text-accent underline underline-offset-4">
            Ehrenamt
          </Link>
        )}
      </nav>
      {!liste.length && <p className="mt-8 text-[15px] text-muted">Zurzeit sind keine Veranstaltungen geplant.</p>}
      {monate.map((m) => (
        <section key={m} className="mt-10">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">{m}</h2>
          <ul className="space-y-3">
            {liste
              .filter((v) => monat(v.beginn) === m)
              .map((v) => (
                <li key={v.id}>
                  <Link href={`/veranstaltungen/${v.id}`} className="glass pressable flex items-start gap-4 rounded-[24px] p-5">
                    <span className="grid w-14 shrink-0 place-items-center rounded-[16px] bg-[var(--line)] py-2 text-center">
                      <span className="text-[20px] font-semibold leading-none tabular-nums">{Number(v.beginn.slice(8, 10))}</span>
                      <span className="mt-1 text-[11px] uppercase text-muted">{tag(v.beginn).split(",")[0]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-semibold">{v.titel}</span>
                      <span className="mt-1 block text-[14px] text-muted">
                        {v.beginn.slice(11)} Uhr · {v.ort}
                        {v.alter ? ` · ${v.alter}` : ""}
                      </span>
                      {v.anmeldung && (
                        <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[12px] ${frei.get(v.id) === 0 ? "bg-[var(--line)] text-muted" : "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success"}`}>
                          {frei.has(v.id) ? (frei.get(v.id)! > 0 ? `Anmeldung · noch ${frei.get(v.id)} Plätze` : "Ausgebucht · Warteliste") : "Anmeldung möglich"}
                        </span>
                      )}
                    </span>
                    <Icon name="chevronRight" className="mt-1 size-4 shrink-0 text-subtle rtl:-scale-x-100" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <Glass className="mt-12 rounded-[24px] p-5 text-[14px] text-muted">
        <Icon name="calendar" className="me-2 inline size-4" />
        Jede Veranstaltung können Sie mit einem Klick in Ihren Kalender übernehmen.
      </Glass>
    </Page>
  );
}
