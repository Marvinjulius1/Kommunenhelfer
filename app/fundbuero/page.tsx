import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anspruch } from "@/components/fundbuero/Anspruch";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { FUND_KATEGORIEN, fundsachen, suche } from "@/lib/fundbuero/service";
import { aktiv } from "@/lib/funktionen";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Fundbüro" };
export const dynamic = "force-dynamic";

const datum = (d: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

export default async function FundbueroSeite({ searchParams }: { searchParams: Promise<{ q?: string; kategorie?: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "fundbuero")) notFound();
  const de = (await getLang(tenant)) === "de";
  const { q = "", kategorie = "" } = await searchParams;
  const alle = await fundsachen(tenant);
  const liste = suche(alle, q.slice(0, 80), FUND_KATEGORIEN.includes(kategorie) ? kategorie : undefined);
  const vorhanden = FUND_KATEGORIEN.filter((k) => alle.some((f) => f.kategorie === k));
  return (
    <Page titel={de ? "Fundbüro" : "Lost and found"} intro={de ? "Etwas verloren? Vielleicht wurde es schon abgegeben." : "Lost something? Maybe it has been handed in."}>
      <form role="search" className="flex gap-2">
        <label htmlFor="fund-q" className="sr-only">
          {de ? "Suchbegriff" : "Search"}
        </label>
        <input id="fund-q" name="q" defaultValue={q} className="field-input flex-1" placeholder={de ? "z. B. Schlüssel, Rucksack, Fahrrad" : "e.g. keys, backpack"} />
        {kategorie && <input type="hidden" name="kategorie" value={kategorie} />}
        <button className="glass pressable rounded-full px-5 text-[15px] font-medium">{de ? "Suchen" : "Search"}</button>
      </form>
      {vorhanden.length > 1 && (
        <nav aria-label={de ? "Kategorien" : "Categories"} className="mt-4 flex flex-wrap gap-2">
          {["", ...vorhanden].map((k) => (
            <Link
              key={k || "alle"}
              href={`/fundbuero?${new URLSearchParams({ ...(q ? { q } : {}), ...(k ? { kategorie: k } : {}) })}`}
              aria-current={k === kategorie ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-[13px] ${k === kategorie ? "border-fg font-medium" : "border-[var(--line)] text-muted"}`}
            >
              {k || (de ? "Alle" : "All")}
            </Link>
          ))}
        </nav>
      )}
      <p className="mt-8 text-[14px] text-subtle" aria-live="polite">
        {liste.length} {de ? (liste.length === 1 ? "Fundsache" : "Fundsachen") : "items"}
      </p>
      <ul className="mt-3 space-y-3">
        {liste.map((f) => (
          <li key={f.id}>
            <Glass className="flex items-start justify-between gap-4 rounded-[24px] p-5">
              <div className="min-w-0">
                <p className="text-[16px] font-semibold">{f.bezeichnung}</p>
                {f.beschreibung && <p className="mt-1 text-[14px] text-muted">{f.beschreibung}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-subtle">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="pin" className="size-3.5" />
                    {f.fundort}
                  </span>
                  <span>{datum(f.funddatum)}</span>
                  <span>{f.kategorie}</span>
                </p>
              </div>
              <Anspruch fundId={f.id} bezeichnung={f.bezeichnung} />
            </Glass>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-[14px] leading-relaxed text-muted">
        {de
          ? "Nicht dabei? Fundsachen werden oft erst nach ein paar Tagen abgegeben. Ausweis verloren? "
          : "Not listed? Items are often handed in after a few days. Lost your ID? "}
        <Link href="/antrag/ausweis-verlust" className="font-medium text-accent underline underline-offset-4">
          {de ? "Verlust melden" : "Report loss"}
        </Link>
      </p>
    </Page>
  );
}
