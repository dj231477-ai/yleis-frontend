import { FeatherCalendar } from "@subframe/core";

export const metadata = { title: "Calendario — Yleis" };

export default function CalendarPage() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-full">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 mb-6">
        <FeatherCalendar className="h-7 w-7 text-neutral-400" />
      </div>
      <h1 className="text-xl font-bold text-neutral-800">Calendario</h1>
      <p className="mt-2 text-sm text-neutral-500 max-w-xs">
        Tu calendario de clases estará disponible próximamente.
      </p>
    </div>
  );
}
