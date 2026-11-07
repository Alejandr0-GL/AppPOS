import { Order } from '../models/pos.models';
import { ReceiptData } from '../models/receipt.models';
import { COMPANY_INFO, RECEIPT_MESSAGES } from '../config/company.config';
import { FINAL_CONSUMER_DOCUMENT, groupTaxes, roundMoney, taxLabel } from './invoice-tax';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  EFECTIVO: 'Efectivo',
  TRANSFER: 'Transferencia',
  TRANSFERENCIA: 'Transferencia',
  CARD: 'Tarjeta',
  TARJETA: 'Tarjeta',
  CREDIT: 'Crédito (pendiente)',
  CREDITO: 'Crédito (pendiente)',
  PENDING: 'Crédito (pendiente)',
  MIXED: 'Mixto'
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completada',
  PAID: 'Pagada',
  PENDING: 'Pendiente de pago',
  CANCELLED: 'Anulada',
  PENDING_ELECTRONIC: 'Pendiente de envío'
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CC: 'C.C.',
  NIT: 'NIT',
  CE: 'C.E.',
  PASSPORT: 'Pasaporte'
};

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return 'No informado';
  const key = method.trim().toUpperCase();
  return PAYMENT_LABELS[key] ?? method;
}

export function documentTypeLabel(invoiceType?: string | null): string {
  return (invoiceType ?? '').toUpperCase() === 'ELECTRONIC' ? 'Factura electrónica' : 'Ticket POS / Factura de venta';
}

export function customerDocumentTypeLabel(documentType?: string | null): string {
  if (!documentType) return 'Doc.';
  const key = documentType.trim().toUpperCase();
  return DOCUMENT_TYPE_LABELS[key] ?? key;
}

/** Estado de la orden en español (POS-06: COMPLETED / PAID / PENDING / CANCELLED). */
export function statusLabel(status?: string | null): string {
  if (!status) return 'Sin estado';
  const key = status.trim().toUpperCase();
  return STATUS_LABELS[key] ?? status;
}

/** ¿La orden está pendiente de pago (venta a crédito)? */
export function isPendingPayment(status?: string | null): boolean {
  return (status ?? '').trim().toUpperCase() === 'PENDING';
}

/** Marca que se estampa en el ticket cuando la orden no está pagada o fue anulada. */
export function receiptStatusStamp(status?: string | null): string | null {
  const key = (status ?? '').trim().toUpperCase();
  if (key === 'PENDING') return 'PENDIENTE DE PAGO';
  if (key === 'CANCELLED') return 'DOCUMENTO ANULADO';
  return null;
}

/** Texto que se muestra en Recibido/Cambio mientras la venta a crédito no se ha cobrado. */
export const PENDING_PAYMENT_AMOUNT_LABEL = 'Pendiente';

type MoneyFormatter = (value: number) => string;

/**
 * Etiqueta de "Recibido" en el ticket. En ventas a crédito sin cobrar muestra "Pendiente";
 * una vez pagada (PAID) muestra el monto real registrado por el servidor.
 */
export function receiptReceivedLabel(data: Pick<ReceiptData, 'status' | 'receivedAmount'>, money: MoneyFormatter): string {
  if (isPendingPayment(data.status)) return PENDING_PAYMENT_AMOUNT_LABEL;
  return data.receivedAmount == null ? 'No registrado' : money(data.receivedAmount);
}

/** Etiqueta de "Cambio" en el ticket ("Pendiente" mientras la venta a crédito no se cobre). */
export function receiptChangeLabel(data: Pick<ReceiptData, 'status' | 'changeAmount'>, money: MoneyFormatter): string {
  if (isPendingPayment(data.status)) return PENDING_PAYMENT_AMOUNT_LABEL;
  return data.changeAmount == null ? '-' : money(data.changeAmount);
}

/** Transforma una orden (POS o historial) en los datos que consume el recibo térmico. */
export function buildReceiptData(order: Order): ReceiptData {
  const taxAmount = roundMoney(order.details.reduce((total, detail) => total + Number(detail.taxAmount ?? 0), 0));
  const total = Number(order.totalAmount ?? 0);
  const isElectronic = (order.invoiceType ?? '').toUpperCase() === 'ELECTRONIC';
  // Dirección/teléfono/tipo de documento sólo si la venta está a nombre de un cliente guardado.
  const savedCustomer = !!order.customer && order.customer.documentNumber !== FINAL_CONSUMER_DOCUMENT;

  // INV-01: etiqueta del impuesto de cada línea (tarifa congelada al vender).
  const lineTaxes = order.details.map(detail => {
    const amount = Number(detail.taxAmount ?? 0);
    const base = Number(detail.subtotal ?? 0) - amount;
    const percentage = Number(detail.appliedTaxPercentage ?? 0) || (amount > 0 && base > 0 ? roundMoney(amount * 100 / base) : 0);
    return { label: amount > 0 ? taxLabel(detail.taxName, percentage) : '', percentage, base, amount };
  });

  return {
    company: COMPANY_INFO,
    documentTitle: documentTypeLabel(order.invoiceType),
    orderNumber: order.orderId,
    issuedAt: order.date ? new Date(order.date) : new Date(),
    cashier: order.user?.username || 'Cajero',
    sectionName: order.section?.name || 'Principal',
    // INV-01: "a nombre de" y documento congelados en la venta (el cliente puede no estar guardado).
    customerName: order.customerName?.trim() || order.customer?.name || 'Consumidor final',
    customerDocumentType: savedCustomer ? customerDocumentTypeLabel(order.customer?.documentType) : 'Doc.',
    customerDocumentNumber: order.customerDocument?.trim() || (savedCustomer ? order.customer?.documentNumber : null) || 'Sin documento',
    customerAddress: savedCustomer ? order.customer?.address ?? null : null,
    customerPhone: savedCustomer ? order.customer?.phone ?? null : null,
    vehiclePlate: order.vehiclePlate?.trim() || null,
    items: order.details.map((detail, index) => ({
      quantity: detail.quantity,
      // POS-07: los ítems "Otros" se imprimen con la descripción escrita en la venta.
      name: detail.description?.trim() || detail.product?.name || `Producto #${detail.productId}`,
      sku: detail.product?.sku ?? null,
      unitPrice: Number(detail.unitPrice ?? 0),
      // INV-01: la línea muestra el valor sin impuesto; el impuesto va en el desglose.
      subtotal: roundMoney(lineTaxes[index].base),
      taxAmount: lineTaxes[index].amount,
      taxLabel: lineTaxes[index].label || null
    })),
    subtotal: roundMoney(total - taxAmount),
    taxAmount,
    showTax: isElectronic || taxAmount > 0,
    taxBreakdown: groupTaxes(lineTaxes).map(({ label, base, amount }) => ({ label, base, amount })),
    discount: 0,
    total,
    paymentMethod: paymentMethodLabel(order.paymentMethod),
    receivedAmount: order.receivedAmount ?? null,
    changeAmount: order.changeAmount ?? null,
    status: order.status,
    thanksMessage: RECEIPT_MESSAGES.thanks,
    policyMessage: RECEIPT_MESSAGES.policy
  };
}
