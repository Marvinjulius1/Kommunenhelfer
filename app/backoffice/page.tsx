import Link from "next/link";
import { redirect } from "next/navigation";
import { FilterSelect } from "@/components/backoffice/Aktionen";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { tx } from "@/lib/i18n";
import { VORGANG_STATUS, type VorgangRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";
import { getTenant } from "@/lib/tenant";
import { bereinigeGelegentlich, STATUS_LABEL } from "@/lib/vorgaenge/service";

export const dynamic = "force-dynamic";

export default async function Vorgaenge({ searchParams }: { searchParams: Promise<{ amt?: string; status?: string; wer?: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  bereinigeGelegentlich();
  const { amt = "", status = "", wer = "" } = await searchParams;

  const aemter = tenant.aemter.filter((a) => darfAmt(b, a.id));
  const liste = (
    await store().list<VorgangRecord>("vorgaenge", (v) => v.tenant === tenant.slug && darfAmt(b, v.amtId) && (!amt || v.amtId === amt) && (!status || v.status === status) && (!wer || (wer === "ich" ? v.zugewiesen === b.name : !v.zugewiesen)))
  ).sort((x, y) => y.erstelltAm.localeCompare(x.erstelltAm));

  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Eingegangene Vorgänge</h1>
          <p className="mt-1 text-[15px] text-muted">{liste.length === 1 ? "1 Vorgang" : `${liste.length} Vorgänge`}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <FilterSelect name="amt" label="Amt" wert={amt} optionen={[{ wert: "", label: "Alle Ämter" }, ...aemter.map((a) => ({ wert: a.id, label: tx(a.name, "de") }))]} />
          <FilterSelect name="wer" label="Zuständig" wert={wer} optionen={[{ wert: "", label: "Alle" }, { wert: "ich", label: "Mir zugewiesen" }, { wert: "offen", label: "Nicht zugewiesen" }]} />
          <FilterSelect name="status" label="Status" wert={status} optionen={[{ wert: "", label: "Alle" }, ...VORGANG_STATUS.map((s) => ({ wert: s, label: STATUS_LABEL[s] }))]} />
        </div>
      </div>

      {liste.length === 0 ? (
        <Glass className="mt-8 rounded-[24px] p-8 text-center text-[15px] text-muted">Keine Vorgänge für diese Auswahl.</Glass>
      ) : (
        <ul className="mt-8 space-y-2">
          {liste.map((v) => {
            const l = tenant.leistungen.find((x) => x.id === v.leistungId);
            const a = tenant.aemter.find((x) => x.id === v.amtId);
            return (
              <li key={v.id}>
                <Link href={`/backoffice/vorgang/${v.id}`} className="block rounded-[16px]">
                  <Glass className="pressable grid items-center gap-2 rounded-[16px] px-6 py-4 text-[14px] md:grid-cols-[10rem_minmax(0,1fr)_11rem_11rem_8rem]">
                    <span className="font-mono">{v.id}</span>
                    <span className="font-medium">{l ? tx(l.titel, "de") : v.quelle === "mangel" ? `Mängelmeldung: ${tx(tenant.maengel?.kategorien.find((k) => k.id === v.mangel?.kategorie)?.label ?? v.mangel?.kategorie ?? "", "de")}` : "Sonstiges Anliegen"}</span>
                    <span className="text-muted">
                      {a ? tx(a.name, "de") : v.amtId}
                      {v.zugewiesen && <span className="block text-[12px] text-subtle">bei {v.zugewiesen}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-subtle md:justify-end">
                      {v.dokumente.length > 0 && (
                        <>
                          <Icon name="paperclip" className="size-4" />
                          {v.dokumente.length}
                        </>
                      )}
                      <span>{fmt.format(new Date(v.erstelltAm))}</span>
                    </span>
                    <span className={`justify-self-start rounded-full px-4 py-1 text-[13px] md:justify-self-end ${v.status === "eingegangen" ? "bg-fg text-bg" : "bg-[var(--line)]"}`}>
                      {STATUS_LABEL[v.status]}
                    </span>
                  </Glass>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
