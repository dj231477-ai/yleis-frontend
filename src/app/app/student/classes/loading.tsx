export default function Loading() {
  return (
    <div className="bg-neutral-50 min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-8 w-40 rounded-lg bg-neutral-200 animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
              <div className="h-8 w-8 rounded bg-neutral-200 animate-pulse mx-auto mb-1" />
              <div className="h-3 w-16 rounded bg-neutral-200 animate-pulse mx-auto" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
                <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-neutral-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
