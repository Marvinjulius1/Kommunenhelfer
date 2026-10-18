import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { kontoFuer } from "@/lib/konto/vertretung";
import { postFuerKonto, postSicht } from "@/lib/postfach/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Postfach" };
export const dynamic = "force-dynamic";

const ART = { bescheid: "Bescheid", nachricht: "Nachricht", erinnerung: "Erinnerung", meldung: "Meldung", zahlung: "Zahlung" } as const;

export default async function Postfach() {
  const k = await kontoFuer(await getTenant(), "post");
  if (!k) redirect("/konto/anmelden?weiter=/konto/postfach");
  const liste = (await postFuerKonto(k)).map(postSicht);
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
  return (
    <Page titel="Postfach" intro="Bescheide und Nachrichten Ihrer Verwaltung – digital statt per Brief.">
      {liste.length === 0 ? (
        <Glass className="rounded-[24px] p-8 text-center text-[15px] text-muted">Ihr Postfach ist leer.</Glass>
      ) : (
        <ul className="space-y-2">
          {liste.map((p) => (
            <li key={p.id}>
              <Link href={`/konto/postfach/${p.id}`} className="glass pressable flex items-center gap-4 rounded-[24px] p-6">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                  <Icon name={p.dokument ? "doc" : "mail"} className="size-5" />
                  {!p.gelesenAm && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-accent" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[16px] ${p.gelesenAm ? "" : "font-semibold"}`}>
                    {p.titel}
                    {!p.gelesenAm && <span className="sr-only"> (ungelesen)</span>}
                  </span>
                  <span className="mt-1 block text-[13px] text-subtle">
                    {ART[p.art]} · {p.absender} · {fmt.format(new Date(p.erstelltAm))}
                  </span>
                </span>
                <Icon name="chevronRight" className="size-4 shrink-0 text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
