import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { sitzungen, type Sitzung } from "@/lib/ratsinfo/service";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Rat und Ausschüsse" };
export const revalidate = 600;

const fmt = (iso: string, de: boolean) => new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));

function Liste({ titel, liste, de }: { titel: string; liste: Sitzung[]; de: boolean }) {
  if (!liste.length) return null;
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">{titel}</h2>
      <ul className="space-y-3">
        {liste.map((s) => (
          <li key={s.id}>
            <Link href={`/ratsinfo/${encodeURIComponent(s.id)}`} className="block rounded-[24px]">
              <Glass className="pressable flex items-center justify-between gap-4 rounded-[24px] p-6">
                <span>
                  <span className="block text-[17px] font-medium">{s.gremium}</span>
                  <span className="mt-1 block text-[14px] text-muted">{fmt(s.datum, de)}</span>
                  <span className="mt-1 block text-[13px] text-subtle">
                    {s.tagesordnung.length} {de ? "Tagesordnungspunkte" : "agenda items"}
                    {s.ort ? ` · ${s.ort}` : ""}
                  </span>
                </span>
                <Icon name="chevronRight" className="size-4 shrink-0 text-subtle" />
              </Glass>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function RatsinfoSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "ratsinfo") || !tenant.ratsinfo) notFound();
  const de = (await getLang(tenant)) === "de";
  const alle = await sitzungen(tenant);
  const jetzt = new Date().toISOString();
  const kommend = alle.filter((s) => new Date(s.datum).toISOString() >= jetzt).reverse();
  const vergangen = alle.filter((s) => new Date(s.datum).toISOString() < jetzt);
  return (
    <Page titel={de ? "Rat und Ausschüsse" : "Council"} intro={de ? "Wann der Rat tagt, worüber er berät und was er beschlossen hat. Die Sitzungen sind öffentlich – Sie können zuhören." : "When the council meets, what it discusses and decides."}>
      <Liste titel={de ? "Nächste Sitzungen" : "Upcoming"} liste={kommend} de={de} />
      <Liste titel={de ? "Vergangene Sitzungen" : "Past meetings"} liste={vergangen.slice(0, 20)} de={de} />
      {!alle.length && <p className="text-[15px] text-muted">{de ? "Zurzeit sind keine Sitzungen veröffentlicht." : "No meetings published."}</p>}
    </Page>
  );
}
