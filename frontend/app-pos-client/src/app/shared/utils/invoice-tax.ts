/**
 * INV-01 · Impuestos según el tipo de factura.
 * - Factura de venta (POS): se cobra el precio del producto y ya (sin impuesto, aunque lo tenga).
 * - Factura electrónica: se suma el impuesto del producto (normalmente IVA) encima del precio.
 * - Los ítems "Otros" nunca llevan impuesto.
 * Debe coincidir con OrdersController.CreateOrder (mismo redondeo a 2 decimales).
 */

export type InvoiceType = 'POS' | 'ELECTRONIC';

/** Documento genérico de la DIAN para "Consumidor Final". */
export const FINAL_CONSUMER_DOCUMENT = '222222222222';

export interface TaxBreakdownLine {
  /** Etiqueta del impuesto, p. ej. "IVA 19%". */
  label: string;
  percentage: number;
  /** Suma de las bases (cantidad × precio) gravadas con esta tarifa. */
  base: number;
  amount: number;
}

/** Redondeo a 2 decimales "away from zero" (igual a MidpointRounding.AwayFromZero de .NET). */
export function roundMoney(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}

/** Impuesto de una línea: base × tarifa / 100, redondeado. */
export function lineTaxAmount(base: number, percentage: number): number {
  if (!percentage || percentage <= 0 || !base) return 0;
  return roundMoney(base * percentage / 100);
}

/** Tarifa que aplica a un producto en la factura elegida (0 si no se cobra impuesto). */
export function applicableTaxPercentage(
  invoiceType: InvoiceType,
  product: { isOpenItem?: boolean; tax?: { percentage: number } | null }
): number {
  if (invoiceType !== 'ELECTRONIC' || product.isOpenItem) return 0;
  const percentage = Number(product.tax?.percentage ?? 0);
  return percentage > 0 ? percentage : 0;
}

/** Etiqueta del impuesto: usa el nombre guardado si ya trae el %, si no "IVA 19%". */
export function taxLabel(name: string | null | undefined, percentage: number): string {
  const pct = `${Number(percentage).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`;
  const trimmed = name?.trim();
  if (!trimmed) return `IVA ${pct}`;
  return trimmed.includes('%') ? trimmed : `${trimmed} ${pct}`;
}

/** Agrupa las líneas con impuesto por tarifa (para el desglose "IVA 19% … $"). */
export function groupTaxes(lines: Array<{ label: string; percentage: number; base: number; amount: number }>): TaxBreakdownLine[] {
  const groups = new Map<string, TaxBreakdownLine>();
  for (const line of lines) {
    if (!line.amount || line.amount <= 0) continue;
    const key = `${line.label}|${line.percentage}`;
    const group = groups.get(key) ?? { label: line.label, percentage: line.percentage, base: 0, amount: 0 };
    group.base = roundMoney(group.base + line.base);
    group.amount = roundMoney(group.amount + line.amount);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.percentage - a.percentage);
}

/**
 * Motivo por el que no se puede emitir la factura electrónica, o null si está bien.
 * Se replica en el software de facturación (allá está el RUT): sólo exige el nombre.
 */
export function electronicInvoiceCustomerError(name: string | null | undefined): string | null {
  const trimmedName = name?.trim() ?? '';
  if (!trimmedName || trimmedName.toLowerCase() === 'consumidor final') return 'Escribe a nombre de quién sale la factura electrónica.';
  return null;
}

/** Placa normalizada: sólo letras y números en mayúsculas ("abc-123" → "ABC123"). */
export function normalizePlate(value: string | null | undefined): string {
  return (value ?? '').replace(/[^0-9a-zñ]/gi, '').toUpperCase();
}
