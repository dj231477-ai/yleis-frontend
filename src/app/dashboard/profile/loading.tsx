export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-28 animate-pulse bg-muted" />
        <div className="px-6 pb-6 pt-4">
          <div className="flex items-end gap-4">
            <div className="-mt-14 h-24 w-24 animate-pulse rounded-2xl bg-muted" />
            <div className="mb-1 space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="h-10 animate-pulse rounded-xl bg-muted" />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="space-y-4 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
