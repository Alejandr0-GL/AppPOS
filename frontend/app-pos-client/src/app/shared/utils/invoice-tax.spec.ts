import {
  applicableTaxPercentage,
  electronicInvoiceCustomerError,
  groupTaxes,
  lineTaxAmount,
  normalizePlate,
  taxLabel
} from './invoice-tax';

describe('INV-01 invoice-tax', () => {
  const iva19 = { tax: { percentage: 19 } };

  it('sólo cobra impuesto en factura electrónica y nunca en ítems "Otros"', () => {
    expect(applicableTaxPercentage('POS', iva19)).toBe(0);
    expect(applicableTaxPercentage('ELECTRONIC', iva19)).toBe(19);
    expect(applicableTaxPercentage('ELECTRONIC', { ...iva19, isOpenItem: true })).toBe(0);
    expect(applicableTaxPercentage('ELECTRONIC', { tax: null })).toBe(0);
  });

  it('calcula el impuesto de la línea redondeado a 2 decimales (igual que el servidor)', () => {
    expect(lineTaxAmount(100000, 19)).toBe(19000);
    expect(lineTaxAmount(12345, 19)).toBe(2345.55);
    expect(lineTaxAmount(10.5, 5)).toBe(0.53);
    expect(lineTaxAmount(50000, 0)).toBe(0);
  });

  it('agrupa el desglose por tarifa e ignora líneas sin impuesto', () => {
    const groups = groupTaxes([
      { label: 'IVA 19%', percentage: 19, base: 100000, amount: 19000 },
      { label: 'IVA 19%', percentage: 19, base: 50000, amount: 9500 },
      { label: 'IVA 5%', percentage: 5, base: 20000, amount: 1000 },
      { label: 'Exento', percentage: 0, base: 7000, amount: 0 }
    ]);
    expect(groups).toEqual([
      { label: 'IVA 19%', percentage: 19, base: 150000, amount: 28500 },
      { label: 'IVA 5%', percentage: 5, base: 20000, amount: 1000 }
    ]);
  });

  it('arma la etiqueta del impuesto', () => {
    expect(taxLabel('IVA 19%', 19)).toBe('IVA 19%');
    expect(taxLabel('IVA', 19)).toBe('IVA 19%');
    expect(taxLabel(null, 5)).toBe('IVA 5%');
  });

  it('la factura electrónica sólo exige a nombre de quién sale', () => {
    expect(electronicInvoiceCustomerError('Taller ABC SAS')).toBeNull();
    expect(electronicInvoiceCustomerError('')).toContain('nombre');
    expect(electronicInvoiceCustomerError('Consumidor final')).toContain('nombre');
  });

  it('normaliza la placa a mayúsculas sin espacios ni guiones', () => {
    expect(normalizePlate('abc 123')).toBe('ABC123');
    expect(normalizePlate('abc-12d')).toBe('ABC12D');
    expect(normalizePlate(null)).toBe('');
  });
});
