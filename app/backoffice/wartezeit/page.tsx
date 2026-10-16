import { redirect } from "next/navigation";
import { Aufruf } from "@/components/backoffice/Schalter";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { tx } from "@/lib/i18n";
import { getTenant } from "@/lib/tenant";
import { wartendeAemter } from "@/lib/wartezeit/service";

export const dynamic = "force-dynamic";

export default async function WartezeitBackoffice() {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  if (!b) redirect("/backoffice/anmelden");
  const aemter = wartendeAemter(tenant)
    .filter((a) => darfAmt(b, a.id))
    .map((a) => ({ id: a.id, name: tx(a.name, "de") }));
  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Wartenummern</h1>
      <p className="mt-1 text-[15px] text-muted">
        Aufrufanzeige für den Wartebereich:{" "}
        <a href="/wartezeit/anzeige" target="_blank" className="underline underline-offset-4">
          /wartezeit/anzeige
        </a>
      </p>
      <div className="mt-6">{aemter.length ? <Aufruf aemter={aemter} /> : <p className="text-[14px] text-muted">Keine Ämter mit Wartenummern.</p>}</div>
    </div>
  );
}
