// ============================================================
// Skeleton de carga del storefront (Industrial Dark)
// ============================================================

export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div
        className="h-[120px] w-full animate-pulse rounded-none border-b border-[#2A2A2A] bg-[#1A1A1A]"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl p-4">
        <div className="mb-4 h-10 max-w-md animate-pulse rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-36 shrink-0 animate-pulse rounded-md border border-[#2A2A2A] bg-[#1A1A1A]"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]"
            >
              <div className="h-[160px] bg-[#242424]" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 rounded bg-[#242424]" />
                <div className="h-3 w-1/2 rounded bg-[#242424]" />
                <div className="h-5 w-1/3 rounded bg-[#242424]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
