import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ayuda — Yleis" };

export default function HelpPage() {
  return (
    <>
      <TopBar title="Ayuda" subtitle="Centro de soporte Yleis" />
      <ComingSoonPage
        icon={HelpCircle}
        title="Ayuda"
        description="Preguntas frecuentes, tutoriales y contacto con el equipo de soporte de Yleis."
      />
    </>
  );
}
