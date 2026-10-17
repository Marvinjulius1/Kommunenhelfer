"use client";

/** Push-Abo für Meldungen (optional nur für einen Ortsteil) – ohne Konto möglich. */
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { pushAbonnieren } from "@/lib/client/push";
import { deutsch } from "@/lib/i18n";

export function MeldungenAbo({ ortsteil }: { ortsteil?: string }) {
  const { lang, konto } = useTenant();
  const de = deutsch(lang);
  const [status, setStatus] = useState<string | null>(null);
  const [aktiv, setAktiv] = useState(false);

  const abonnieren = async () => {
    const r = await pushAbonnieren(konto ? ["konto", "meldungen"] : ["meldungen"], { ortsteil });
    if (r === "ok") {
      setAktiv(true);
      if (konto) await fetch("/api/konto/einstellungen", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ pushBenachrichtigung: true, ...(ortsteil ? { ortsteil } : {}) }) });
    }
    setStatus(
      r === "ok"
        ? de
          ? `Sie erhalten neue Meldungen${ortsteil ? ` für ${ortsteil}` : ""} als Benachrichtigung.`
          : "You will receive new notices as notifications."
        : r === "abgelehnt"
          ? de
            ? "Bitte erlauben Sie Benachrichtigungen in Ihrem Browser."
            : "Please allow notifications in your browser."
          : de
            ? "Benachrichtigungen sind auf diesem Gerät nicht verfügbar."
            : "Notifications are not available on this device.",
    );
  };

  return (
    <div>
      <button type="button" onClick={abonnieren} disabled={aktiv} className="glass pressable flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium disabled:text-subtle">
        <Icon name="bell" className="size-4" />
        {aktiv ? (de ? "Benachrichtigungen aktiv" : "Notifications on") : de ? "Bei neuen Meldungen benachrichtigen" : "Notify me about new notices"}
      </button>
      <p role="status" className="mt-2 text-[14px] text-muted">
        {status}
      </p>
    </div>
  );
}
