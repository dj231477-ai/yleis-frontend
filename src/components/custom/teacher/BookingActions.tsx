"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/ui/components/Button";
import { FeatherCheck, FeatherLoader, FeatherX } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  bookingId: string;
};

export function BookingActions({ bookingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function handleAction(action: "accept" | "reject") {
    setLoading(action);
    const supabase = createClient();
    const newStatus = action === "accept" ? "confirmed" : "cancelled_teacher";

    await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);

    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="brand-secondary"
        size="small"
        icon={loading === "accept" ? <FeatherLoader className="animate-spin" /> : <FeatherCheck />}
        onClick={() => handleAction("accept")}
        disabled={loading !== null}
      >
        Aceptar
      </Button>
      <Button
        variant="neutral-secondary"
        size="small"
        icon={loading === "reject" ? <FeatherLoader className="animate-spin" /> : <FeatherX />}
        onClick={() => handleAction("reject")}
        disabled={loading !== null}
      >
        Rechazar
      </Button>
    </div>
  );
}
