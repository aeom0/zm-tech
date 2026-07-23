type Props = {
  name: string;
  role: string;
  country: string;
  avatar: string;
  color: string;
  text: string;
  stars: number;
};

export function TestimonialCard({
  name,
  role,
  country,
  avatar,
  color,
  text,
  stars,
}: Props) {
  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm h-full">
      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: stars }).map((_, i) => (
          <span key={i} className="text-accent text-lg">
            ★
          </span>
        ))}
      </div>

      {/* Text */}
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed flex-1 italic">
        &ldquo;{text}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            {name}
          </p>
          <p className="text-xs text-zinc-500">
            {role} · {country}
          </p>
        </div>
      </div>
    </div>
  );
}
