import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { oeffentlicheMaengel } from "@/lib/maengel/service";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Mängelmelder" };
export const dynamic = "force-dynamic";

const datum = (iso: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(new Date(iso));

export default async function MaengelSeite() {
  const tenant = await getTenant();
  if (!aktiv(tenant, "maengelmelder") || !tenant.maengel) notFound();
  const lang = await getLang(tenant);
  const de = lang === "de";
  const liste = await oeffentlicheMaengel(tenant, lang);
  const offen = liste.filter((m) => m.status !== "erledigt").length;
  return (
    <Page titel={de ? "Mängelmelder" : "Issue reports"} intro={de ? "Was gemeldet wurde – und was schon erledigt ist." : "What has been reported – and what has been fixed."}>
      <ButtonLink href="/maengel/melden">{de ? "Mangel melden" : "Report an issue"}</ButtonLink>
      <p className="mt-10 text-[14px] text-subtle">
        {de ? `${offen} offen · ${liste.length - offen} in den letzten 30 Tagen erledigt` : `${offen} open · ${liste.length - offen} fixed in the last 30 days`}
      </p>
      {liste.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{de ? "Zurzeit liegen keine Meldungen vor." : "There are no reports at the moment."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {liste.map((m) => (
            <li key={m.id}>
              <Glass className="flex items-start justify-between gap-4 rounded-[24px] p-6">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold">{m.kategorieLabel}</p>
                  <p className="mt-1 flex items-center gap-2 text-[14px] text-muted">
                    <Icon name="pin" className="size-3.5 shrink-0" />
                    <span className="truncate">{m.ort}</span>
                    {m.lat !== undefined && m.lng !== undefined && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=18/${m.lat}/${m.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 underline underline-offset-4"
                      >
                        {de ? "Karte" : "Map"}
                        <span className="sr-only">{de ? " (OpenStreetMap, öffnet in neuem Fenster)" : " (OpenStreetMap, opens in new window)"}</span>
                      </a>
                    )}
                  </p>
                  <p className="mt-1 text-[13px] text-subtle">
                    {de ? "gemeldet am" : "reported"} {datum(m.gemeldetAm)}
                    {m.erledigtAm ? ` · ${de ? "erledigt am" : "fixed"} ${datum(m.erledigtAm)}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] ${m.status === "erledigt" ? "text-success" : "bg-[var(--line)]"}`}>{m.statusLabel}</span>
              </Glass>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
