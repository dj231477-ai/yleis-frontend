import { TopBar } from "@/components/layout/TopBar";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";
import { CreditCard } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagos — Yleis" };

export default function BillingPage() {
  return (
    <>
      <TopBar title="Pagos" subtitle="Historial de transacciones y facturación" />
      <ComingSoonPage
        icon={CreditCard}
        title="Pagos"
        description="Consulta tu historial de pagos, descarga facturas y gestiona tus métodos de pago (PSE, Nequi, tarjeta)."
      />
    </>
  );
}
