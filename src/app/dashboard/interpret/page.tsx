import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { Mic2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Interpreta — Yleis" };

export default function InterpretPage() {
  return (
    <>
      <TopBar title="Interpreta" subtitle="Gestiona tus servicios de interpretación" />
      <ComingSoonPage
        icon={Mic2}
        title="Interpreta"
        description="Ofrece interpretación simultánea y consecutiva. Gestiona solicitudes y sesiones en tiempo real."
      />
    </>
  );
}
