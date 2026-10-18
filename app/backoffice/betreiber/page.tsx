/** Betreiber-Cockpit: alle Gemeinden, Pakete, Jahresumsatz, neue Gemeinde oder Demo per Klick. */
import { redirect } from "next/navigation";
import { BetreiberGemeinde, NeueGemeindeFormular } from "@/components/backoffice/Betreiber";
import { Glass } from "@/components/ui/Glass";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { jahrespreis, PAKETE } from "@/lib/funktionen";
import { alleGemeinden } from "@/lib/mandanten/service";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default async function Betreiber() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (b.gemeinde !== "*" || !hatRolle(b, "admin")) return <p className="text-[14px] text-muted">Der Betreiber-Bereich ist nur für Konten mit Zugriff auf alle Gemeinden.</p>;
  const liste = await alleGemeinden();
  const kunden = liste.filter((g) => !g.demo && g.config.paket);
  const umsatz = kunden.reduce((s, g) => s + jahrespreis(g.config.paket!, g.config.einwohner), 0);
  const einwohner = kunden.reduce((s, g) => s + (g.config.einwohner ?? 0), 0);
  const portal = process.env.PORTAL_URL;
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Gemeinden</h1>
      <p className="mt-1 text-[15px] text-muted">Alle Mandanten des Portals – aus Konfigurationsdateien und hier angelegt.</p>
      <p className="mt-1 text-[13px] text-subtle">„Ansehen“ wechselt in diesem Browser die Gemeinde (Vorschau). Zurück zum Backoffice: /?gemeinde={tenant.slug}</p>

      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [String(kunden.length), "zahlende Gemeinden"],
          [euro(umsatz), "Jahresumsatz (netto)"],
          [new Intl.NumberFormat("de-DE").format(einwohner), "Einwohner erreicht"],
          [String(liste.filter((g) => g.demo).length), "Demo-Gemeinden"],
        ].map(([w, l]) => (
          <li key={l}>
            <Glass className="h-full rounded-[20px] p-5">
              <p className="text-[26px] font-semibold tabular-nums tracking-tight">{w}</p>
              <p className="mt-1 text-[13px] text-muted">{l}</p>
            </Glass>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
        <ul className="space-y-2">
          {liste.map((g) => (
            <li key={g.config.slug}>
              <BetreiberGemeinde
                slug={g.config.slug}
                name={`${g.config.art} ${g.config.name}`}
                wappen={g.config.wappen}
                quelle={g.quelle}
                demo={g.demo}
                paket={g.config.paket}
                einwohner={g.config.einwohner}
                preis={g.config.paket ? jahrespreis(g.config.paket, g.config.einwohner) : undefined}
                loeschenAm={g.demo ? g.loeschenAm : undefined}
                vorschau={`/?gemeinde=${g.config.slug}`}
                adresse={portal?.includes("{gemeinde}") ? portal.replace("{gemeinde}", g.config.slug) : undefined}
              />
            </li>
          ))}
        </ul>
        <div className="space-y-6">
          <Glass className="rounded-[24px] p-6">
            <h2 className="text-[17px] font-semibold">Neue Gemeinde oder Demo</h2>
            <p className="mt-1 text-[13px] text-muted">Eine Demo enthält alle Beispieldaten der Musterstadt mit Name, Farbe und Wappen der Gemeinde – ideal fürs Verkaufsgespräch. Sie löscht sich nach 60 Tagen.</p>
            <NeueGemeindeFormular />
          </Glass>
          <Glass className="rounded-[24px] p-6">
            <h2 className="text-[17px] font-semibold">Pakete</h2>
            <ul className="mt-3 space-y-3 text-[14px]">
              {Object.entries(PAKETE).map(([id, p]) => (
                <li key={id}>
                  <p className="font-medium">
                    {p.name} · {euro(p.grundpreisEuro)} + {p.jeEinwohnerCent} ct je Einwohner/Jahr
                  </p>
                  <p className="text-[13px] text-muted">{p.beschreibung}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-subtle">Beispielpreise – anpassbar in lib/funktionen.ts.</p>
          </Glass>
        </div>
      </div>
    </div>
  );
}
