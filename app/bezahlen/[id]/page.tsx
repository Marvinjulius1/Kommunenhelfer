import type { Metadata } from "next";
import { Suspense } from "react";
import { Bezahlen } from "@/components/zahlung/Bezahlen";
import { Page } from "@/components/ui/Page";
import { zahlungsAnbieter } from "@/lib/zahlung/anbieter";

export const metadata: Metadata = { title: "Bezahlen", robots: { index: false } };

export default async function BezahlSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page titel="Gebühr bezahlen">
      <Suspense>
        <Bezahlen id={id} testmodus={zahlungsAnbieter()?.id === "demo"} />
      </Suspense>
    </Page>
  );
}
