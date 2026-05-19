import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { Settings } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configuración — Yleis" };

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Configuración" subtitle="Ajustes de tu cuenta" />
      <ComingSoonPage
        icon={Settings}
        title="Configuración"
        description="Ajustes avanzados de cuenta, privacidad, idioma de la plataforma y más."
      />
    </>
  );
}
