import { SkeletonCircle } from "@/ui/components/SkeletonCircle";
import { SkeletonText } from "@/ui/components/SkeletonText";

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <SkeletonText size="label" className="mb-4 w-36" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonCircle />
            <div className="flex flex-1 flex-col gap-1.5">
              <SkeletonText size="default" className="w-32" />
              <SkeletonText size="label" className="w-20" />
            </div>
            <SkeletonText size="label" className="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherDashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <div className="h-6 w-16 rounded bg-neutral-200 animate-pulse" />
        <div className="flex items-center gap-3">
          <SkeletonText size="label" className="w-28" />
          <SkeletonCircle />
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <SkeletonText size="header" className="w-52" />
          <SkeletonText size="label" className="w-64" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={3} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <SkeletonText size="label" className="mb-3 w-32" />
            <SkeletonText size="header" className="w-40" />
            <SkeletonText size="label" className="mt-1 w-48" />
          </div>
          <CardSkeleton rows={1} />
        </div>
      </main>
    </div>
  );
}
