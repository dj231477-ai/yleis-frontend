import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendario — Yleis" };

export default function CalendarPage() {
  return (
    <>
      <TopBar title="Calendario" subtitle="Tu agenda de clases y sesiones" />
      <ComingSoonPage
        icon={Calendar}
        title="Calendario"
        description="Visualiza y gestiona todas tus sesiones programadas en un calendario integrado."
      />
    </>
  );
}
