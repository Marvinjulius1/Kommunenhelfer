import type { Metadata } from "next";
import { Booking } from "@/components/booking/Booking";

export const metadata: Metadata = { title: "Termin buchen" };

export default async function TerminSeite({ searchParams }: { searchParams: Promise<{ leistung?: string }> }) {
  const { leistung } = await searchParams;
  return <Booking vorauswahl={leistung} />;
}
