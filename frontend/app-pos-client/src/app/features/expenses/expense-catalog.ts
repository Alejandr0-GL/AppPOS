import { ExpensePaymentMethod, ExpenseScope } from './services/expenses.service';

/**
 * EXP-01: categorías sugeridas por ámbito. La API acepta cualquier texto (máx. 60), así que
 * "Otra…" permite escribir una nueva; las ya usadas aparecen en los filtros automáticamente.
 */
export const EXPENSE_CATEGORIES: Record<ExpenseScope, readonly string[]> = {
  BUSINESS: [
    'Arriendo',
    'Servicios públicos',
    'Nómina',
    'Insumos',
    'Mantenimiento',
    'Transporte',
    'Impuestos',
    'Publicidad',
    'Otros gastos del negocio'
  ],
  PERSONAL: [
    'Mercado',
    'Hogar',
    'Servicios del hogar',
    'Educación',
    'Salud',
    'Transporte',
    'Entretenimiento',
    'Retiro personal',
    'Otros gastos familiares'
  ]
};

export const SCOPE_LABELS: Record<ExpenseScope, string> = {
  BUSINESS: 'Negocio',
  PERSONAL: 'Personal / Familiar'
};

export const PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta'
};

/** Fecha local en formato yyyy-MM-dd (sin pasar por UTC, que en Colombia corre el día). */
export function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-11-06T00:00:00" → "06/11/2026" sin conversiones de zona horaria. */
export function formatExpenseDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
