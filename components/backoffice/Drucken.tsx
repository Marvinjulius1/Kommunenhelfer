"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** „Als PDF speichern“ über den Druckdialog des Browsers – ohne Server, ohne Bibliothek. */
export function Drucken() {
  return (
    <Button variant="glass" className="!min-h-10 px-4 text-[14px] print:hidden" onClick={() => window.print()}>
      <Icon name="doc" className="size-4" />
      Als PDF speichern
    </Button>
  );
}
