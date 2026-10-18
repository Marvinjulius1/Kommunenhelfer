import { redirect } from "next/navigation";
import { AdminFormular, type AdminLeistung } from "@/components/backoffice/Admin";
import { ladeAnpassungen } from "@/lib/admin/anpassungen";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import { tx } from "@/lib/i18n";
import { basisTenant, getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminSeite() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  if (!hatRolle(b, "admin")) return <p className="text-[14px] text-muted">Den Admin-Bereich sehen Benutzer mit der Rolle „admin“.</p>;
  const basis = await basisTenant(tenant.slug);
  const a = await ladeAnpassungen(tenant.slug);
  const leistungen: AdminLeistung[] = basis.leistungen
    .map((l) => ({
      id: l.id,
      titel: tx(l.titel, "de"),
      aktiv: l.aktiv,
      kurz: tx(l.kurz, "de"),
      beschreibung: l.beschreibung ? tx(l.beschreibung, "de") : "",
      gebuehren: l.gebuehren.map((g) => ({ bezeichnung: tx(g.bezeichnung, "de"), betrag: g.betrag, ...(g.hinweis ? { hinweis: tx(g.hinweis, "de") } : {}) })),
    }))
    .sort((x, y) => x.titel.localeCompare(y.titel, "de"));
  const aktuell = Object.fromEntries(
    Object.entries(a?.leistungen ?? {}).map(([id, x]) => [
      id,
      {
        ...(x.aktiv !== undefined ? { aktiv: x.aktiv } : {}),
        ...(x.kurz ? { kurz: tx(x.kurz, "de") } : {}),
        ...(x.beschreibung ? { beschreibung: tx(x.beschreibung, "de") } : {}),
        ...(x.gebuehren ? { gebuehren: x.gebuehren.map((g) => ({ bezeichnung: tx(g.bezeichnung, "de"), betrag: g.betrag, ...(g.hinweis ? { hinweis: tx(g.hinweis, "de") } : {}) })) } : {}),
      },
    ]),
  );
  const t = basis.texte;
  const texteBasis = { untertitel: t.untertitel ? tx(t.untertitel, "de") : "Bürgerservice online", platzhalter: tx(t.platzhalter, "de"), begruessung: tx(t.begruessung, "de") };
  const texteAktuell = Object.fromEntries(Object.entries(a?.texte ?? {}).map(([k, v]) => [k, tx(v as never, "de")]));
  return (
    <div className="max-w-3xl">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Portal anpassen</h1>
      <p className="mt-1 text-[15px] text-muted">
        Änderungen gelten sofort. Die Konfigurationsdatei bleibt unverändert – gespeichert wird nur die Abweichung.{a?.geaendertVon ? ` Zuletzt geändert von ${a.geaendertVon}.` : ""}
      </p>
      <div className="mt-8">
        <AdminFormular basis={leistungen} aktuell={aktuell} texteBasis={texteBasis} texteAktuell={texteAktuell} />
      </div>
    </div>
  );
}
