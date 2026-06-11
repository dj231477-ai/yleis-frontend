"use client";

import { BookingModal } from "@/components/custom/classes/BookingModal";
import { Button } from "@/ui/components/Button";
import { FeatherPlus } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Subject = { id: string; name: string; category: string | null };
type Teacher = { id: string; full_name: string; hourly_rate: number | null };

type Props = {
  subjects: Subject[];
  teachers: Teacher[];
};

export function BookingModalTrigger({ subjects, teachers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess(bookingId: string) {
    setOpen(false);
    router.refresh();
    // Pequeño toast visual podría ir aquí en V2
    void bookingId;
  }

  return (
    <>
      <Button
        variant="brand-primary"
        size="medium"
        icon={<FeatherPlus />}
        onClick={() => setOpen(true)}
      >
        Programar clase
      </Button>

      {open && (
        <BookingModal
          subjects={subjects}
          teachers={teachers}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
