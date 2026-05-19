import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis Solicitudes — Yleis" };

export default function RequestsPage() {
  return (
    <>
      <TopBar title="Mis Solicitudes" subtitle="Historial de solicitudes de servicio" />
      <ComingSoonPage
        icon={FileText}
        title="Mis Solicitudes"
        description="Aquí verás todas tus solicitudes de traducción, interpretación y clases express."
      />
    </>
  );
}
