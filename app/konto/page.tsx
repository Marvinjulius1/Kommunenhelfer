import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Anstehend } from "@/components/konto/Anstehend";
import { Kachel } from "@/components/konto/Kachel";
import { AbmeldenKnopf, AnliegenUebernehmen } from "@/components/konto/KontoAktionen";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { aktiv } from "@/lib/funktionen";
import { kontoUebersicht } from "@/lib/konto/uebersicht";
import { aktuellesKonto, profilVon } from "@/lib/konto/service";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Mein Konto" };
export const dynamic = "force-dynamic";

export default async function KontoSeite({ searchParams }: { searchParams: Promise<{ bestaetigt?: string }> }) {
  const tenant = await getTenant();
  if (!aktiv(tenant, "konto")) redirect("/");
  const k = await aktuellesKonto(tenant);
  if (!k) redirect("/konto/anmelden?weiter=/konto");
  const p = profilVon(k);
  const u = await kontoUebersicht(tenant, k);
  const { bestaetigt } = await searchParams;
  const stunde = Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", timeZone: "Europe/Berlin" }).format(new Date()));
  const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";

  const hinweise: { text: string; href: string; link: string }[] = [];
  if (!p.email) hinweise.push({ text: "Bitte hinterlegen Sie Ihre E-Mail-Adresse, damit wir Sie über Ihre Anliegen informieren können.", href: "/konto/profil", link: "E-Mail hinterlegen" });
  else if (!k.emailBestaetigt) hinweise.push({ text: "Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen geschickt haben.", href: "/konto/profil", link: "Adresse prüfen" });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] sm:text-[40px]">
            {gruss}
            {p.vorname ? `, ${p.vorname}` : ""}.
          </h1>
          <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
            {k.vertrauensniveau === "hoch" ? (
              <>
                <Icon name="id" className="size-4" /> Identität mit Online-Ausweis geprüft
              </>
            ) : (
              <>
                <Icon name="mail" className="size-4" /> Konto mit E-Mail-Adresse
                {aktiv(tenant, "onlineAusweis") && (
                  <Link href="/konto/ausweis?weiter=/konto" className="text-accent underline underline-offset-2">
                    Mit Online-Ausweis bestätigen
                  </Link>
                )}
              </>
            )}
          </p>
        </div>
        <AbmeldenKnopf />
      </div>

      {bestaetigt === "1" && <p className="mt-6 text-[15px] text-success">Vielen Dank – Ihre E-Mail-Adresse ist bestätigt.</p>}

      {hinweise.length > 0 && (
        <ul className="mt-8 space-y-2">
          {hinweise.map((h, i) => (
            <li key={i}>
              <Glass className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-6">
                <p className="flex items-start gap-2 text-[15px]">
                  <Icon name="bell" className="mt-0.5 size-4 shrink-0" />
                  {h.text}
                </p>
                <Link href={h.href} className="text-[15px] font-medium text-accent underline underline-offset-2">
                  {h.link}
                </Link>
              </Glass>
            </li>
          ))}
        </ul>
      )}

      {aktiv(tenant, "hinweise") && <Anstehend start={u.hinweise} haushaltLeer={!p.kinder?.length && p.hund === undefined && p.grundbesitz === undefined && !p.reisepassGueltigBis} />}

      <div className="mt-8">
        <AnliegenUebernehmen />
      </div>

      <h2 className="sr-only">Bereiche</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {u.kacheln.map((k) => (
          <Kachel key={k.href} {...k} />
        ))}
      </div>
    </div>
  );
}
