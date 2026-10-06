/**
 * Parser Constancia NPS (Sunat) — JSON estricto de Haiku.
 * Extraído a .mjs para QA Node + Deno (mismo patrón que qa-phone.mjs).
 */
import { isSalonStaffPhone } from "./qa-phone.mjs";

/**
 * Solo el WhatsApp staff del salón (+51 932 535 512) puede registrar Constancia NPS.
 * QA 978–999 y extras (51911100001) no — suprimen push, no autorizan OCR.
 * @param {string} phone
 * @returns {boolean}
 */
export function isAuthorizedSunatNpsPhone(phone) {
  return isSalonStaffPhone(phone);
}

/**
 * Período SUNAT AAAAMM → primer día del mes siguiente (mes de pago).
 * Ej. 202607 (julio) se paga en agosto → 2026-08-01.
 * @returns {string | null}
 */
export function expenseMonthFromPeriod(periodo) {
  const raw = String(periodo ?? "").replace(/\D/g, "");
  if (raw.length !== 6) return null;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  const month = Number.parseInt(raw.slice(4, 6), 10);
  if (!Number.isFinite(year) || year < 2020 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${next.y}-${String(next.m).padStart(2, "0")}-01`;
}

/**
 * @param {unknown} tributos
 * @returns {{ codigo: string, monto: number }[]}
 */
function normalizeTributos(tributos) {
  if (!Array.isArray(tributos)) return [];
  const out = [];
  for (const row of tributos) {
    if (!row || typeof row !== "object") continue;
    const codigo = String(row.codigo ?? "").trim().slice(0, 20);
    const monto = Number.parseFloat(String(row.monto ?? "").replace(",", "."));
    if (!codigo || !Number.isFinite(monto) || monto < 0) continue;
    out.push({ codigo, monto: Number(monto.toFixed(2)) });
  }
  return out;
}

/**
 * @param {string} raw
 * @returns {{
 *   ok: boolean,
 *   periodo: string | null,
 *   total: number | null,
 *   tributos: { codigo: string, monto: number }[],
 *   reason: string | null,
 * }}
 */
export function parseSunatNpsJson(raw) {
  const empty = {
    ok: false,
    periodo: null,
    total: null,
    tributos: [],
    reason: "parse_error",
  };
  if (typeof raw !== "string" || !raw.trim()) return empty;
  try {
    const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned);
    if (parsed?.ok !== true) {
      return {
        ...empty,
        reason:
          typeof parsed?.reason === "string" && parsed.reason.trim()
            ? parsed.reason.trim().slice(0, 80)
            : "not_nps",
      };
    }
    const periodo = String(parsed.periodo ?? "").replace(/\D/g, "");
    const total = Number.parseFloat(
      String(parsed.total ?? "").replace(",", "."),
    );
    if (periodo.length !== 6 || !Number.isFinite(total) || total <= 0) {
      return { ...empty, reason: "missing_fields" };
    }
    if (!expenseMonthFromPeriod(periodo)) {
      return { ...empty, reason: "invalid_periodo" };
    }
    return {
      ok: true,
      periodo,
      total: Number(total.toFixed(2)),
      tributos: normalizeTributos(parsed.tributos),
      reason: null,
    };
  } catch {
    return empty;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} message
 * @returns {boolean}
 */
export function isPdfDocumentMessage(message) {
  if (!message || message.type !== "document") return false;
  const doc =
    message.document && typeof message.document === "object"
      ? /** @type {Record<string, unknown>} */ (message.document)
      : null;
  if (!doc) return false;
  const mime = String(doc.mime_type ?? "").toLowerCase().split(";")[0].trim();
  const filename = String(doc.filename ?? "").toLowerCase();
  return mime === "application/pdf" || filename.endsWith(".pdf");
}
