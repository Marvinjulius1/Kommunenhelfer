import Link from "next/link";
import { redirect } from "next/navigation";
import { FilterSelect } from "@/components/backoffice/Aktionen";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { zustaendigFuer } from "@/lib/backoffice/vertretung";
import { tx } from "@/lib/i18n";
import { VORGANG_STATUS, type VorgangRecord } from "@/lib/records";
import { store } from "@/lib/storage/store";
import { getTenant } from "@/lib/tenant";
import { bereinigeGelegentlich, STATUS_LABEL } from "@/lib/vorgaenge/service";
import { fristlage } from "@/lib/vorgaenge/fristen";

export const dynamic = "force-dynamic";

export default async function Vorgaenge({ searchParams }: { searchParams: Promise<{ amt?: string; status?: string; wer?: string; frist?: string }> }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  bereinigeGelegentlich();
  const { amt = "", status = "", wer = "", frist = "" } = await searchParams;
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

  const aemter = tenant.aemter.filter((a) => darfAmt(b, a.id));
  // Eigene Vorgänge plus die von Kolleginnen und Kollegen, die heute vertreten werden
  const meine = await zustaendigFuer(tenant, b.name);
  const liste = (
    await store().list<VorgangRecord>("vorgaenge", (v) => v.tenant === tenant.slug && darfAmt(b, v.amtId) && (!amt || v.amtId === amt) && (!status || v.status === status) && (!wer || (wer === "ich" ? !!v.zugewiesen && meine.includes(v.zugewiesen) : !v.zugewiesen)))
  )
    .map((v) => ({ v, fl: fristlage(tenant, v, heute) }))
    .filter(({ fl }) => !frist || (frist === "faellig" ? !!fl && (fl.ueberfaellig || fl.bald || fl.wiedervorlageFaellig) : !!fl?.ueberfaellig))
    // Fällige Wiedervorlagen und überschrittene Fristen zuerst, danach die neuesten
    .sort((x, y) => Number(!!y.fl?.wiedervorlageFaellig || !!y.fl?.ueberfaellig) - Number(!!x.fl?.wiedervorlageFaellig || !!x.fl?.ueberfaellig) || y.v.erstelltAm.localeCompare(x.v.erstelltAm));
  const ueberfaellig = liste.filter(({ fl }) => fl?.ueberfaellig).length;

  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Eingegangene Vorgänge</h1>
          <p className="mt-1 text-[15px] text-muted">
            {liste.length === 1 ? "1 Vorgang" : `${liste.length} Vorgänge`}
            {ueberfaellig > 0 && <span className="text-danger"> · {ueberfaellig} über der Frist</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <FilterSelect name="amt" label="Amt" wert={amt} optionen={[{ wert: "", label: "Alle Ämter" }, ...aemter.map((a) => ({ wert: a.id, label: tx(a.name, "de") }))]} />
          <FilterSelect name="wer" label="Zuständig" wert={wer} optionen={[{ wert: "", label: "Alle" }, { wert: "ich", label: "Mir zugewiesen" }, { wert: "offen", label: "Nicht zugewiesen" }]} />
          <FilterSelect name="frist" label="Frist" wert={frist} optionen={[{ wert: "", label: "Alle" }, { wert: "faellig", label: "Fällig & Wiedervorlage" }, { wert: "ueberfaellig", label: "Überschritten" }]} />
          <FilterSelect name="status" label="Status" wert={status} optionen={[{ wert: "", label: "Alle" }, ...VORGANG_STATUS.map((s) => ({ wert: s, label: STATUS_LABEL[s] }))]} />
        </div>
      </div>

      {liste.length === 0 ? (
        <Glass className="mt-8 rounded-[24px] p-8 text-center text-[15px] text-muted">Keine Vorgänge für diese Auswahl.</Glass>
      ) : (
        <ul className="mt-8 space-y-2">
          {liste.map(({ v, fl }) => {
            const l = tenant.leistungen.find((x) => x.id === v.leistungId);
            const a = tenant.aemter.find((x) => x.id === v.amtId);
            return (
              <li key={v.id}>
                <Link href={`/backoffice/vorgang/${v.id}`} className="block rounded-[16px]">
                  <Glass className="pressable grid items-center gap-2 rounded-[16px] px-6 py-4 text-[14px] md:grid-cols-[10rem_minmax(0,1fr)_11rem_11rem_8rem]">
                    <span>
                      <span className="block font-mono">{v.id}</span>
                      {fl && (fl.wiedervorlageFaellig || fl.ueberfaellig || fl.bald) && (
                        <span className={`mt-1 block text-[12px] ${fl.ueberfaellig ? "font-medium text-danger" : "text-subtle"}`}>
                          {fl.wiedervorlageFaellig ? "Wiedervorlage" : fl.ueberfaellig ? `Frist −${-fl.rest} WT` : fl.rest === 0 ? "Frist heute" : `Frist in ${fl.rest} WT`}
                        </span>
                      )}
                    </span>
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
