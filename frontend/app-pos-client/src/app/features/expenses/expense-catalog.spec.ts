import { EXPENSE_CATEGORIES, PAYMENT_METHOD_LABELS, SCOPE_LABELS, formatExpenseDate, toLocalIsoDate } from './expense-catalog';

describe('EXP-01 expense-catalog', () => {
  it('toLocalIsoDate usa la fecha local (no UTC): las 23:30 siguen siendo el mismo día', () => {
    expect(toLocalIsoDate(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06');
    expect(toLocalIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('formatExpenseDate muestra dd/MM/yyyy sin correr el día por zona horaria', () => {
    expect(formatExpenseDate('2026-11-06T00:00:00')).toBe('06/11/2026');
    expect(formatExpenseDate('2026-01-01')).toBe('01/01/2026');
  });

  it('tiene categorías sugeridas para ambos ámbitos y etiquetas en español', () => {
    expect(EXPENSE_CATEGORIES.BUSINESS).toContain('Arriendo');
    expect(EXPENSE_CATEGORIES.PERSONAL).toContain('Mercado');
    expect(SCOPE_LABELS.BUSINESS).toBe('Negocio');
    expect(SCOPE_LABELS.PERSONAL).toBe('Personal / Familiar');
    expect(PAYMENT_METHOD_LABELS.CASH).toBe('Efectivo');
  });
});
