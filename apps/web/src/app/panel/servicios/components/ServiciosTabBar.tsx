"use client";

type TabId = "categorias" | "servicios" | "packs" | "promos";

const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
  { id: "categorias", label: "Categorías" },
  { id: "servicios", label: "Servicios" },
  { id: "packs", label: "Packs" },
  { id: "promos", label: "Promos" },
];

export function ServiciosTabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !t.disabled && onChange(t.id)}
            disabled={t.disabled}
            className={[
              "px-4 py-2 rounded-xl border text-sm font-semibold whitespace-nowrap transition-colors",
              t.disabled
                ? "bg-white/[0.02] border-white/[0.06] text-zinc-500 cursor-not-allowed"
                : isActive
                  ? "bg-white/[0.06] border-white/[0.10] text-white"
                  : "bg-transparent border-white/[0.06] text-zinc-300 hover:bg-white/[0.04] hover:border-white/[0.08]",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export type { TabId };
