import { ReceiptData } from '../models/receipt.models';
import { buildEscPosReceipt, buildReceiptLines } from './escpos-print.service';

const receipt: ReceiptData = {
  company: {
    name: 'AppPOS Soluciones',
    nit: '901.234.567-8',
    address: 'Calle 45 # 12-34, Local 5 · Medellín',
    phone: '+57 604 322 1188',
    email: 'ventas@apppos.local'
  },
  documentTitle: 'Ticket POS / Factura de venta',
  orderNumber: 42,
  issuedAt: new Date('2026-10-30T10:15:00'),
  cashier: 'admin',
  sectionName: 'Lubricentro',
  customerName: 'Juan Pérez',
  customerDocumentType: 'C.C.',
  customerDocumentNumber: '10203040',
  customerAddress: 'Calle 10 # 20-30',
  customerPhone: '3001234567',
  items: [
    { quantity: 2, name: 'Cambio de aceite', sku: 'SRV-ACEITE', unitPrice: 50000, subtotal: 119000, taxAmount: 19000 }
  ],
  subtotal: 100000,
  taxAmount: 19000,
  discount: 0,
  total: 119000,
  paymentMethod: 'Efectivo',
  receivedAmount: 120000,
  changeAmount: 1000,
  status: 'COMPLETED',
  thanksMessage: '¡Gracias por su compra!',
  policyMessage: 'Cambios y devoluciones dentro de los 30 días presentando este comprobante.'
};

function contains(haystack: Uint8Array, needle: number[]): boolean {
  for (let index = 0; index <= haystack.length - needle.length; index++) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset++) {
      if (haystack[index + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/** Texto imprimible (descarta los bytes de comando ESC/POS). */
function printableText(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) {
    if (byte >= 0x20 && byte <= 0x7e) text += String.fromCharCode(byte);
  }
  return text;
}

describe('escpos-print.service', () => {
  it('inicializa la impresora (ESC @) y termina con avance + corte', () => {
    const bytes = buildEscPosReceipt(receipt, '58mm');

    expect(Array.from(bytes.slice(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(bytes.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it('emite negritas nativas y tamaños normal/destacado', () => {
    const bytes = buildEscPosReceipt(receipt, '58mm');

    expect(contains(bytes, [0x1b, 0x45, 0x01])).toBe(true); // ESC E 1 (bold on)
    expect(contains(bytes, [0x1b, 0x45, 0x00])).toBe(true); // ESC E 0 (bold off)
    expect(contains(bytes, [0x1d, 0x21, 0x00])).toBe(true); // GS ! 0 (normal)
    expect(contains(bytes, [0x1d, 0x21, 0x11])).toBe(true); // GS ! 17 (doble ancho + alto)
  });

  it('ajusta todas las líneas a 32 columnas exactas en 58 mm', () => {
    const lines = buildReceiptLines(receipt, '58mm');

    expect(lines.length).toBeGreaterThan(10);
    for (const line of lines) {
      const limit = line.big ? 16 : 32;
      expect(line.text.length).toBeLessThanOrEqual(limit);
    }
  });

  it('ajusta las líneas a 48 columnas en 80 mm', () => {
    const lines = buildReceiptLines(receipt, '80mm');

    for (const line of lines) {
      const limit = line.big ? 24 : 48;
      expect(line.text.length).toBeLessThanOrEqual(limit);
    }
  });

  it('translitera acentos y símbolos a ASCII imprimible', () => {
    const text = printableText(buildEscPosReceipt(receipt, '58mm'));

    expect(text).toContain('!Gracias por su compra!');
    expect(text).toContain('Juan Perez');
    expect(text).toContain('Medellin');
    expect(text).not.toContain('¡');
    expect(text).not.toContain('é');
  });

  it('incluye los datos clave del recibo', () => {
    const text = printableText(buildEscPosReceipt(receipt, '58mm'));

    expect(text).toContain('AppPOS Soluciones');
    expect(text).toContain('#42');
    expect(text).toContain('Cambio de aceite');
    expect(text).toContain('SRV-ACEITE');
    expect(text).toContain('TOTAL');
    expect(text).toContain('119.000');
    expect(text).toContain('Efectivo');
  });

  it('genera un buffer binario con comandos y sin caracteres fuera de ASCII', () => {
    const bytes = buildEscPosReceipt(receipt, '58mm');

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(200);
    // Sólo ASCII imprimible (0x20-0x7E), LF (0x0A) y comandos ESC/POS (0x00-0x1F).
    expect(Array.from(bytes).every(byte => byte <= 0x7e)).toBe(true);
  });
});
