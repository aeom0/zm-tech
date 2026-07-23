"use client";

import { useServicios } from "@/hooks/servicios/useServicios";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ServicePickerCheckbox({ selectedIds, onChange }: Props) {
  const { data: services = [] } = useServicios();
  const activeServices = services.filter((s) => s.is_active);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto">
      {activeServices.map((svc) => (
        <label
          key={svc.id}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(svc.id)}
            onChange={() => toggle(svc.id)}
            className="accent-[#40E0D0]"
          />
          <span className="text-sm text-white/80">{svc.name}</span>
          <span className="ml-auto text-xs text-white/40">
            {Number.parseFloat(String(svc.price)).toLocaleString("es-VE", {
              minimumFractionDigits: 2,
            })}
          </span>
        </label>
      ))}
    </div>
  );
}
