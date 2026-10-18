import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { istLive, sitzung } from "@/lib/ratsinfo/service";
import { getLang, getTenant } from "@/lib/tenant";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = await sitzung(await getTenant(), decodeURIComponent((await params).id));
  return { title: s ? s.gremium : "Sitzung" };
}

export default async function SitzungSeite({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "ratsinfo")) notFound();
  const s = await sitzung(tenant, decodeURIComponent((await params).id));
  if (!s) notFound();
  const de = (await getLang(tenant)) === "de";
  const datum = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(s.datum));
  const vorbei = new Date(s.datum) < new Date();
  return (
    <Page titel={s.gremium} intro={`${datum}${s.ort ? ` · ${s.ort}` : ""}`}>
      <Link href="/ratsinfo" className="mb-6 inline-flex items-center gap-1 text-[14px] text-muted hover:text-fg">
        <Icon name="chevronLeft" className="size-4" />
        {de ? "Alle Sitzungen" : "All meetings"}
      </Link>
      {(s.livestream || s.aufzeichnung) && (
        <Glass className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-5">
          <p className="flex items-center gap-2 text-[15px]">
            <Icon name="video" className="size-5" />
            {istLive(s) ? (de ? "Die Sitzung läuft gerade – live zuschauen." : "The meeting is live now.") : s.aufzeichnung && vorbei ? (de ? "Die Aufzeichnung ist verfügbar." : "The recording is available.") : de ? "Diese Sitzung wird live übertragen." : "This meeting will be streamed live."}
          </p>
          {(istLive(s) || (!vorbei && s.livestream) || (vorbei && s.aufzeichnung)) && (
            <a href={istLive(s) || !vorbei ? s.livestream : s.aufzeichnung} target="_blank" rel="noopener noreferrer" className="pressable inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-[14px] font-medium text-on-accent">
              {istLive(s) ? (de ? "Live ansehen" : "Watch live") : vorbei ? (de ? "Aufzeichnung ansehen" : "Watch recording") : de ? "Zum Livestream" : "Livestream"}
              <Icon name="external" className="size-4" />
            </a>
          )}
        </Glass>
      )}
      <h2 className="text-[20px] font-semibold">{de ? "Tagesordnung" : "Agenda"}</h2>
      <ol className="mt-4 space-y-3">
        {s.tagesordnung
          .filter((t) => t.oeffentlich)
          .map((t, i) => (
            <li key={i}>
              <Glass className="rounded-[20px] p-5">
                <p className="text-[16px] font-medium">
                  <span className="mr-2 text-subtle">{t.nummer ?? i + 1}.</span>
                  {t.titel}
                </p>
                {t.kurz && <p className="mt-1 text-[14px] leading-relaxed text-muted">{t.kurz}</p>}
                {t.beschluss && (
                  <p className="mt-3 flex items-start gap-2 text-[14px]">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>
                      <span className="font-medium">{de ? "Beschluss: " : "Decision: "}</span>
                      {t.beschluss}
                    </span>
                  </p>
                )}
              </Glass>
            </li>
          ))}
      </ol>
      {s.tagesordnung.some((t) => !t.oeffentlich) && <p className="mt-4 text-[13px] text-subtle">{de ? "Nichtöffentliche Punkte werden nicht angezeigt." : "Non-public items are not shown."}</p>}
      {!vorbei && (
        <p className="mt-8 text-[15px] leading-relaxed text-muted">
          {de ? "Die Sitzung ist öffentlich. Sie können ohne Anmeldung zuhören." : "The meeting is public."}
        </p>
      )}
      {s.link && (
        <p className="mt-6">
          <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[15px] font-medium text-accent underline underline-offset-4">
            {de ? "Im Ratsinformationssystem (mit Vorlagen)" : "In the council information system"}
            <Icon name="external" className="size-4" />
          </a>
        </p>
      )}
    </Page>
  );
}
