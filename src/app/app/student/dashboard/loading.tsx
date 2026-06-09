import { SkeletonCircle } from "@/ui/components/SkeletonCircle";
import { SkeletonText } from "@/ui/components/SkeletonText";

export default function StudentDashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Header skeleton */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <div className="h-6 w-16 rounded bg-neutral-200 animate-pulse" />
        <div className="flex items-center gap-3">
          <SkeletonText size="label" className="w-28" />
          <SkeletonCircle />
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Welcome */}
        <div className="mb-8 flex flex-col gap-2">
          <SkeletonText size="header" className="w-48" />
          <SkeletonText size="label" className="w-64" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Next class skeleton */}
          <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
            <SkeletonText size="label" className="w-32" />
            <div className="flex items-center gap-3">
              <SkeletonCircle className="h-12 w-12" />
              <div className="flex flex-col gap-1.5 flex-1">
                <SkeletonText size="default" className="w-36" />
                <SkeletonText size="label" className="w-24" />
              </div>
            </div>
            <SkeletonText size="label" className="w-48" />
            <SkeletonText size="subheader" />
          </div>

          {/* Active bookings skeleton */}
          <div className="flex flex-col gap-3">
            <SkeletonText size="label" className="w-36" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <SkeletonCircle />
                <div className="flex flex-1 flex-col gap-1.5">
                  <SkeletonText size="default" className="w-28" />
                  <SkeletonText size="label" className="w-20" />
                </div>
                <SkeletonText size="label" className="w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="mt-8">
          <SkeletonText size="label" className="mb-3 w-28" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-5"
              >
                <div className="h-8 w-8 rounded-md bg-neutral-200 animate-pulse" />
                <SkeletonText size="label" className="w-20" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
