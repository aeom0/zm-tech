"use client";

import { useEffect, useRef } from "react";

const INTERVALO_MAX_MS = 50;
const INACTIVIDAD_MS = 100;
const LARGO_MINIMO = 3;

/**
 * Detecta un lector de código de barras HID (actúa como teclado): ráfaga de
 * teclas con intervalo corto entre ellas, terminada en Enter. Descarta el
 * buffer si el tecleo es más lento (humano) o si pasa el umbral de
 * inactividad sin Enter.
 */
export function useBarcodeScan(
  onScan: (codigo: string) => void,
  options?: { enabled?: boolean },
): void {
  const enabled = options?.enabled ?? true;
  const bufferRef = useRef("");
  const ultimaTeclaRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    function limpiarBuffer() {
      bufferRef.current = "";
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    function handleKeyDown(e: KeyboardEvent) {
      const objetivo = e.target as HTMLElement | null;
      const enCampoLibre =
        objetivo &&
        (objetivo.tagName === "TEXTAREA" ||
          (objetivo.tagName === "INPUT" &&
            objetivo.getAttribute("data-barcode-input") !== "true"));

      const ahora = Date.now();
      const intervalo = ahora - ultimaTeclaRef.current;
      ultimaTeclaRef.current = ahora;

      if (e.key === "Enter") {
        const codigo = bufferRef.current;
        limpiarBuffer();
        if (codigo.length >= LARGO_MINIMO && !enCampoLibre) {
          e.preventDefault();
          onScanRef.current(codigo);
        }
        return;
      }

      if (e.key.length !== 1) return; // ignora Shift, Tab, flechas, etc.

      if (intervalo > INTERVALO_MAX_MS) {
        // tecleo demasiado lento para ser un scanner: reinicia el buffer
        bufferRef.current = "";
      }

      bufferRef.current += e.key;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(limpiarBuffer, INACTIVIDAD_MS);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled]);
}
