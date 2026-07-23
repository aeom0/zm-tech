import { LUNARIS } from "@/lib/theme";

interface MetricSkeletonProps {
  variant: "card" | "list-item" | "bar";
  className?: string;
}

export function MetricSkeleton({
  variant,
  className = "",
}: MetricSkeletonProps) {
  if (variant === "card") {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-[#1A1A1A] p-5 space-y-4 ${className}`}
      >
        <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
        <div className="h-10 w-40 rounded bg-white/10 animate-pulse" />
        <div className="h-3 w-full max-w-[160px] rounded bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (variant === "list-item") {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 w-3/5 max-w-[140px] rounded bg-white/10 animate-pulse" />
          <div className="h-2 w-full rounded bg-white/10 animate-pulse" />
        </div>
        <div className="h-4 w-16 shrink-0 rounded bg-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={`h-3 w-full rounded-full overflow-hidden ${className}`}
      style={{ background: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="h-full w-1/3 animate-pulse"
        style={{ background: LUNARIS.gradient.css, opacity: 0.35 }}
      />
    </div>
  );
}
