import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { Languages } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Traduce — Yleis" };

export default function TranslatePage() {
  return (
    <>
      <TopBar title="Traduce" subtitle="Gestiona tus servicios de traducción" />
      <ComingSoonPage
        icon={Languages}
        title="Traduce"
        description="Publica tus servicios de traducción, gestiona proyectos y entrega documentos traducidos."
      />
    </>
  );
}
