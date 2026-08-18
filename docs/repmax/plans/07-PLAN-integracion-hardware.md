# 07 — Integración de hardware (POS de escritorio)

> **Estado: fase 1 implementada** (ago 2026) — POS de escritorio en `/dashboard/pos` + scanner HID. Fases 2-4 (impresión térmica/fiscal vía Bridge) siguen en **PROPUESTA**, bloqueadas por confirmación de hardware/cliente piloto. Alcance: `apps/repmax-web`, plan Pro/Turbo (dispositivos fiscales).

**Objetivo:** conectar impresora fiscal SENIAT, ticket térmico, scanner y A4 al panel web vía un agente local (RepMAX Bridge). El scanner HID y `window.print()` no requieren Bridge.

---

## 1. Problema

RepMAX web corre como PWA en el navegador (Chrome/Edge sobre Windows 11).
Para que el tenant sienta un software administrativo real y no solo un
catálogo bonito, necesita conectar:

- Impresora fiscal (obligatoria en Venezuela — SENIAT)
- Impresora térmica de recibos (58/80mm, ESC/POS)
- Lector de código de barras
- Impresoras normales (facturas A4, reportes)

El navegador está sandboxeado por diseño y no puede acceder a estos
dispositivos de forma directa, salvo excepciones limitadas (WebUSB,
WebSerial, WebHID — solo Chromium, sin soporte en Safari/Firefox). Las
impresoras fiscales certificadas en Venezuela traen SDK propietario
(DLL/COM para Windows, protocolo RS-232/USB por fabricante), imposible de
invocar desde el navegador bajo ningún escenario.

## 2. Arquitectura propuesta: RepMAX Bridge

Patrón estándar de la industria POS (Square, Clover, QZ Tray): un agente
local instalado en la PC del tenant que actúa de traductor entre el
navegador y el hardware.

```
RepMAX web (Next.js, navegador)
        │  HTTP/WS → http://127.0.0.1:9000
        ▼
RepMAX Bridge (agente local, Windows, siempre activo)
        │
        ├── Impresora fiscal      (SDK del fabricante, USB/RS-232)
        ├── Impresora térmica     (ESC/POS, USB/red)
        ├── Scanner de código     (HID teclado o serial)
        └── Impresora normal      (facturas/reportes PDF)
```

El navegador nunca toca el hardware directamente — todo pasa por el
Bridge.

## 3. Por dispositivo

| Dispositivo           | Complejidad | Vía                         | Notas                                                                                                                                                     |
| --------------------- | ----------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scanner de código     | Baja        | HID keyboard wedge          | 95% de los lectores actúan como teclado. No requiere Bridge. Hook `useBarcodeScan()` detecta ráfagas de teclado + Enter para distinguir de tecleo manual. |
| Impresora normal (A4) | Baja        | `window.print()` / PDF      | Ya resuelto con las herramientas actuales del navegador.                                                                                                  |
| Impresora térmica     | Media       | Bridge → ESC/POS crudo      | Sin Bridge solo queda `window.print()`, que no sirve para ticket de 58/80mm con corte automático.                                                         |
| Impresora fiscal      | Alta        | Bridge → SDK del fabricante | Cada marca (The Factory HKA, Zonda, Fiscal Ndemasi, etc.) tiene protocolo propio, no intercambiable. Bloqueante hasta confirmar marca del cliente piloto. |

## 4. Capas de código (respeta arquitectura por capas del proyecto)

```
apps/repmax-web/src/
  lib/hardware/
    bridgeClient.ts            // fetch/WebSocket a localhost:9000 — único punto de acoplamiento (fase 3, no implementado)
    services/
      fiscalPrinterService.ts  // interface IFiscalPrinter (abrir venta, imprimir, anular) — fase 4, no implementado
      receiptPrinterService.ts // interface IReceiptPrinter (ESC/POS) — fase 3, no implementado
      barcodeService.ts        // hook useBarcodeScan() — IMPLEMENTADO, funciona sin Bridge
  hooks/
    useHardwareStatus.ts       // detecta si el Bridge está corriendo, banner si no — no implementado (no aplica hasta fase 3)
  components/pos/
    ProductSearchGrid.tsx      // búsqueda/grid de catálogo — IMPLEMENTADO
    CartSidebar.tsx            // carrito con stepper de cantidad — IMPLEMENTADO
    CheckoutSheet.tsx          // cobro, método de pago, banner de caja — IMPLEMENTADO
  app/dashboard/pos/page.tsx   // pantalla `/dashboard/pos`, gating por rol — IMPLEMENTADO
```

`IFiscalPrinter` como interfaz permite que, al cambiar de marca de
impresora fiscal por tenant, solo se escriba un nuevo adapter en el
Bridge — cero cambios en la UI.

## 5. Roadmap por fases

1. **Scanner por HID** — ✅ implementado. `useBarcodeScan()` + POS de
   escritorio completo (`/dashboard/pos`: catálogo, carrito, cobro vía
   `repmax_create_sale_with_items`, banner de caja no bloqueante, gating
   por rol `owner`/`cashier`).
2. **`window.print()` para facturas/reportes** — cubre A4, sin Bridge.
3. **RepMAX Bridge MVP** — agente Node.js (empaquetado con `pkg` o
   Electron), corre en bandeja de Windows, expone
   `POST /print/receipt` con ESC/POS.
4. **Integración fiscal** — depende 100% del SDK del fabricante de la
   máquina fiscal del cliente piloto. Bloqueado hasta tener esa
   confirmación.

## 6. Preguntas abiertas / bloqueadores

- ¿Cuál es el cliente piloto con máquina fiscal instalada y de qué
  marca? Cambia el protocolo por completo (The Factory ≠ Zonda ≠
  Fiscal Ndemasi).
- ¿El Bridge se distribuye como instalador manual o se automatiza el
  despliegue/actualización (auto-update)?
- ¿Se requiere firma de código para el instalador de Windows
  (SmartScreen)?

## 7. Riesgos

- Dependencia de un proceso corriendo en segundo plano en la PC del
  tenant — requiere manejo de estado "Bridge desconectado" en toda la
  UI que dependa de hardware.
- Soporte multi-marca de impresora fiscal implica mantenimiento
  continuo de adapters a medida que se suman clientes con hardware
  distinto.
