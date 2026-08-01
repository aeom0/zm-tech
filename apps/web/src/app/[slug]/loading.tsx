// ============================================================
// Skeleton de carga del storefront (Industrial Dark)
// ============================================================

export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div
        className="h-[120px] w-full animate-pulse rounded-none bg-[#1A1A1A] border-b border-[#2A2A2A]"
        aria-hidden
      />
      <div className="p-4 max-w-7xl mx-auto">
        <div className="h-10 max-w-md animate-pulse rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] mb-4" />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-36 shrink-0 animate-pulse rounded-md bg-[#1A1A1A] border border-[#2A2A2A]"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden animate-pulse"
            >
              <div className="h-[160px] bg-[#242424]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[#242424] rounded w-3/4" />
                <div className="h-3 bg-[#242424] rounded w-1/2" />
                <div className="h-5 bg-[#242424] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
