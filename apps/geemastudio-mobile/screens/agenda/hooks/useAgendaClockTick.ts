import { useEffect, useState } from "react";

/** Hora “ahora” para la línea actual en agenda; actualiza cada 30s. */
export function useAgendaClockTick(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    tick();
    return () => clearInterval(id);
  }, [active]);

  return now;
}
