import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Ausschreibungen" };

export default async function AusschreibungenSeite() {
  const tenant = await getTenant();
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const liste = (tenant.ausschreibungen ?? []).filter((a) => a.frist >= heute).sort((a, b) => a.frist.localeCompare(b.frist));
  if (!tenant.ausschreibungen) notFound();
  return (
    <Page titel="Ausschreibungen" intro={`Aufträge der ${tenant.art} ${tenant.name}. Die Unterlagen und die Abgabe von Angeboten laufen über die Vergabeplattform.`}>
      {liste.length ? (
        <ul className="space-y-3">
          {liste.map((a) => (
            <li key={a.id}>
              <Glass className="rounded-[24px] p-6">
                <p className="text-[13px] text-subtle">
                  {a.vergabeart} · Nr. {a.id}
                </p>
                <h2 className="mt-1 text-[17px] font-semibold">{a.titel}</h2>
                <p className="mt-1 text-[15px] text-muted">{a.kurz}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[14px]">
                  <span className="font-medium">Angebotsfrist: {new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(a.frist + "T12:00:00Z"))}</span>
                  <a href={a.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline underline-offset-4">
                    Zur Vergabeplattform <Icon name="external" className="size-3.5" />
                  </a>
                </div>
              </Glass>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted">Zurzeit gibt es keine offenen Ausschreibungen.</p>
      )}
      <p className="mt-8 text-[14px] text-muted">
        Für Ihr Unternehmen erledigen Sie Gewerbe, Sondernutzungen und Gebühren im{" "}
        <Link href="/konto/vollmachten" className="font-medium text-accent underline underline-offset-4">
          Unternehmenskonto
        </Link>
        .
      </p>
    </Page>
  );
}
