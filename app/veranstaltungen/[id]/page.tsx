import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KurzFormular } from "@/components/dienste/KurzFormular";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";
import { anmeldungen, belegt, veranstaltung } from "@/lib/veranstaltungen/service";

export const metadata: Metadata = { title: "Veranstaltung" };
export const dynamic = "force-dynamic";

const wann = (d: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d.slice(0, 10) + "T12:00:00Z"));

export default async function VeranstaltungSeite({ params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "veranstaltungen")) notFound();
  const v = await veranstaltung(tenant, (await params).id);
  if (!v) notFound();
  const verein = tenant.vereine?.find((x) => x.id === v.vereinId);
  const frei = v.anmeldung && v.plaetze ? v.plaetze - belegt(await anmeldungen(tenant, v.id)) : undefined;
  const vorbei = (v.ende ?? v.beginn) < new Date().toISOString().slice(0, 16);
  const ende = v.ende ? (v.ende.slice(0, 10) === v.beginn.slice(0, 10) ? `${v.ende.slice(11)} Uhr` : `${wann(v.ende)}, ${v.ende.slice(11)} Uhr`) : undefined;
  return (
    <Page titel={v.titel} intro={v.text}>
      <Link href="/veranstaltungen" className="-mt-6 mb-6 inline-flex items-center gap-1 text-[14px] text-muted hover:text-fg">
        <Icon name="chevronLeft" className="size-4 rtl:-scale-x-100" />
        Alle Veranstaltungen
      </Link>
      <Glass className="rounded-[24px] p-6">
        <dl className="grid gap-4 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-subtle">Wann</dt>
            <dd>
              {wann(v.beginn)}, {v.beginn.slice(11)} Uhr{ende ? ` bis ${ende}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-subtle">Wo</dt>
            <dd>{v.ort}</dd>
          </div>
          {v.kosten && (
            <div>
              <dt className="text-[13px] text-subtle">Kosten</dt>
              <dd>{v.kosten}</dd>
            </div>
          )}
          {v.alter && (
            <div>
              <dt className="text-[13px] text-subtle">Alter</dt>
              <dd>{v.alter}</dd>
            </div>
          )}
          {verein && (
            <div>
              <dt className="text-[13px] text-subtle">Veranstalter</dt>
              <dd>{verein.name}</dd>
            </div>
          )}
          {frei !== undefined && (
            <div>
              <dt className="text-[13px] text-subtle">Plätze</dt>
              <dd>{frei > 0 ? `noch ${frei} von ${v.plaetze} frei` : "ausgebucht – Warteliste möglich"}</dd>
            </div>
          )}
        </dl>
        <a href={`/api/veranstaltungen/${v.id}/ics`} className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-accent">
          <Icon name="calendar" className="size-4" />
          In meinen Kalender
        </a>
      </Glass>
      {v.anmeldung && !vorbei && (
        <section className="mt-10">
          <h2 className="mb-4 text-[20px] font-semibold tracking-tight">{frei === 0 ? "Auf die Warteliste" : "Anmelden"}</h2>
          <KurzFormular
            endpoint="/api/veranstaltungen/anmeldung"
            basis={{ veranstaltungId: v.id }}
            felder={["anzahl", "telefon", "hinweis"]}
            maxAnzahl={Math.max(1, Math.min(6, v.plaetze ?? 6))}
            knopf={frei === 0 ? "Auf die Warteliste setzen" : "Verbindlich anmelden"}
            erfolg="Sie sind angemeldet. Die Bestätigung mit Kalendereintrag und Abmeldelink haben wir Ihnen per E-Mail geschickt."
            erfolgWarteliste="Die Veranstaltung ist ausgebucht – Sie stehen auf der Warteliste. Wird ein Platz frei, rücken Sie automatisch nach und wir schreiben Ihnen."
            zweck="für diese Anmeldung (Löschung 30 Tage nach der Veranstaltung)"
          />
        </section>
      )}
    </Page>
  );
}
