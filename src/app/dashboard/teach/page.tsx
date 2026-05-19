import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enseña — Yleis" };

export default function TeachPage() {
  return (
    <>
      <TopBar title="Enseña" subtitle="Gestiona tus clases y estudiantes" />
      <ComingSoonPage
        icon={BookOpen}
        title="Enseña"
        description="Configura tu perfil docente, define tu disponibilidad y recibe solicitudes de clase."
      />
    </>
  );
}
