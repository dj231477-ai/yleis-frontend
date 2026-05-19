import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis Clases — Yleis" };

export default function ClassesPage() {
  return (
    <>
      <TopBar title="Mis Clases" subtitle="Historial y próximas sesiones" />
      <ComingSoonPage
        icon={BookOpen}
        title="Mis Clases"
        description="Aquí aparecerán tus clases programadas, el historial de sesiones y los materiales de cada clase."
      />
    </>
  );
}
