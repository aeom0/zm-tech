"use client";

type BusinessType = {
  id: string;
  label: string;
  emoji: string;
};

type Props = {
  types: BusinessType[];
  active: string;
  onChange: (id: string) => void;
};

export function BusinessTypeTab({ types, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {types.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
            active === t.id
              ? "bg-primary text-white shadow-lg shadow-primary/25"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          <span>{t.emoji}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
