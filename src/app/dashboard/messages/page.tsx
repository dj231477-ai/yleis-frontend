import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mensajes — Yleis" };

export default function MessagesPage() {
  return (
    <>
      <TopBar title="Mensajes" subtitle="Chat con docentes y profesionales" />
      <ComingSoonPage
        icon={MessageSquare}
        title="Mensajes"
        description="Comunícate directamente con docentes, traductores e intérpretes antes y después de cada sesión."
      />
    </>
  );
}
