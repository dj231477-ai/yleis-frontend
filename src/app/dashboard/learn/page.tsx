import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aprende — Yleis" };

export default function LearnPage() {
  return (
    <>
      <TopBar title="Aprende" subtitle="Clases en vivo con docentes certificados" />
      <ComingSoonPage
        icon={GraduationCap}
        title="Aprende"
        description="Encuentra y reserva clases en vivo con docentes certificados. Inglés, francés, portugués y más."
      />
    </>
  );
}
