"use client";

/** Deutlich sichtbar: Sie handeln gerade für eine andere Person oder ein Unternehmen. */
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";

export function Vertretungsleiste() {
  const { konto } = useTenant();
  const pfad = usePathname();
  const router = useRouter();
  const v = konto?.handeltFuer;
  if (!v || pfad.startsWith("/backoffice")) return null;
  const zurueck = async () => {
    await fetch("/api/konto/vollmachten", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aktion: "wechseln", id: null }) });
    router.refresh();
  };
  return (
    <div role="region" aria-label="Vertretung" className="bg-fg text-bg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[14px] sm:px-6">
        <Icon name={v.art === "organisation" ? "home" : "users"} className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          Sie handeln für <span className="font-semibold">{v.name}</span>
          {v.art === "vollmacht" && <span className="opacity-75"> (Vollmacht)</span>}
        </span>
        <button type="button" onClick={zurueck} className="shrink-0 underline underline-offset-2">
          Zurück zu meinem Konto
        </button>
      </div>
    </div>
  );
}
