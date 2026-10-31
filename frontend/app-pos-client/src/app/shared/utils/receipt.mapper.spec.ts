import { Order } from '../models/pos.models';
import { COMPANY_INFO } from '../config/company.config';
import { buildReceiptData, documentTypeLabel, paymentMethodLabel } from './receipt.mapper';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 42,
    customerId: 7,
    sectionId: 1,
    section: { sectionId: 1, name: 'Lubricentro' },
    date: '2026-10-30T10:15:00',
    totalAmount: 119000,
    paymentMethod: 'CASH',
    receivedAmount: 120000,
    changeAmount: 1000,
    invoiceType: 'POS',
    status: 'COMPLETED',
    customer: {
      customerId: 7,
      name: 'Juan Pérez',
      documentNumber: '10203040',
      documentType: 'CC',
      address: 'Calle 10 # 20-30',
      city: 'Medellín',
      department: 'Antioquia',
      phone: '3001234567'
    },
    user: { userId: 1, username: 'admin' },
    details: [
      {
        orderDetailId: 1,
        productId: 10,
        quantity: 2,
        unitPrice: 50000,
        unitCost: 30000,
        employeeId: null,
        taxAmount: 19000,
        subtotal: 119000,
        product: { productId: 10, sku: 'SRV-ACEITE', barcode: null, name: 'Cambio de aceite' }
      }
    ],
    ...overrides
  } as Order;
}

describe('receipt.mapper', () => {
  it('arma el encabezado y los datos de la orden para el ticket', () => {
    const receipt = buildReceiptData(createOrder());

    expect(receipt.company.name).toBe(COMPANY_INFO.name);
    expect(receipt.company.nit).toBe(COMPANY_INFO.nit);
    expect(receipt.documentTitle).toBe('Ticket POS / Factura de venta');
    expect(receipt.orderNumber).toBe(42);
    expect(receipt.cashier).toBe('admin');
    expect(receipt.sectionName).toBe('Lubricentro');
    expect(receipt.customerName).toBe('Juan Pérez');
    expect(receipt.customerDocumentType).toBe('C.C.');
    expect(receipt.customerDocumentNumber).toBe('10203040');
  });

  it('calcula subtotal sin IVA, impuestos y total a pagar', () => {
    const receipt = buildReceiptData(createOrder());

    expect(receipt.subtotal).toBe(100000);
    expect(receipt.taxAmount).toBe(19000);
    expect(receipt.discount).toBe(0);
    expect(receipt.total).toBe(119000);
  });

  it('copia los ítems vendidos con su precio unitario y subtotal', () => {
    const receipt = buildReceiptData(createOrder());

    expect(receipt.items.length).toBe(1);
    expect(receipt.items[0]).toEqual({
      quantity: 2,
      name: 'Cambio de aceite',
      sku: 'SRV-ACEITE',
      unitPrice: 50000,
      subtotal: 119000,
      taxAmount: 19000
    });
  });

  it('mantiene efectivo recibido y cambio, y los deja nulos cuando no aplican', () => {
    const cash = buildReceiptData(createOrder());
    expect(cash.paymentMethod).toBe('Efectivo');
    expect(cash.receivedAmount).toBe(120000);
    expect(cash.changeAmount).toBe(1000);

    const transfer = buildReceiptData(createOrder({ paymentMethod: 'TRANSFER', receivedAmount: null, changeAmount: null }));
    expect(transfer.paymentMethod).toBe('Transferencia');
    expect(transfer.receivedAmount).toBeNull();
    expect(transfer.changeAmount).toBeNull();
  });

  it('usa datos por defecto cuando la orden no trae cliente ni productos relacionados', () => {
    const receipt = buildReceiptData(
      createOrder({
        customer: null,
        user: null,
        section: null,
        details: [{ orderDetailId: 9, productId: 99, quantity: 1, unitPrice: 15000, unitCost: 0, taxAmount: 0, subtotal: 15000 }]
      })
    );

    expect(receipt.customerName).toBe('Consumidor final');
    expect(receipt.customerDocumentNumber).toBe('Sin documento');
    expect(receipt.cashier).toBe('Cajero');
    expect(receipt.sectionName).toBe('Principal');
    expect(receipt.items[0].name).toBe('Producto #99');
    expect(receipt.items[0].sku).toBeNull();
  });

  it('traduce el tipo de comprobante y el método de pago', () => {
    expect(documentTypeLabel('ELECTRONIC')).toBe('Factura electrónica');
    expect(documentTypeLabel('POS')).toBe('Ticket POS / Factura de venta');
    expect(documentTypeLabel(undefined)).toBe('Ticket POS / Factura de venta');
    expect(paymentMethodLabel('CASH')).toBe('Efectivo');
    expect(paymentMethodLabel('transfer')).toBe('Transferencia');
    expect(paymentMethodLabel('NEQUI')).toBe('NEQUI');
    expect(paymentMethodLabel(null)).toBe('No informado');
  });
});
