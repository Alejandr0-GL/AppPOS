import { Order } from '../models/pos.models';
import { ReceiptData } from '../models/receipt.models';
import { COMPANY_INFO, RECEIPT_MESSAGES } from '../config/company.config';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  EFECTIVO: 'Efectivo',
  TRANSFER: 'Transferencia',
  TRANSFERENCIA: 'Transferencia',
  CARD: 'Tarjeta',
  TARJETA: 'Tarjeta',
  CREDIT: 'Crédito',
  MIXED: 'Mixto'
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

/** Transforma una orden (POS o historial) en los datos que consume el recibo térmico. */
export function buildReceiptData(order: Order): ReceiptData {
  const taxAmount = order.details.reduce((total, detail) => total + Number(detail.taxAmount ?? 0), 0);
  const total = Number(order.totalAmount ?? 0);

  return {
    company: COMPANY_INFO,
    documentTitle: documentTypeLabel(order.invoiceType),
    orderNumber: order.orderId,
    issuedAt: order.date ? new Date(order.date) : new Date(),
    cashier: order.user?.username || 'Cajero',
    sectionName: order.section?.name || 'Principal',
    customerName: order.customer?.name || 'Consumidor final',
    customerDocumentType: customerDocumentTypeLabel(order.customer?.documentType),
    customerDocumentNumber: order.customer?.documentNumber || 'Sin documento',
    customerAddress: order.customer?.address ?? null,
    customerPhone: order.customer?.phone ?? null,
    items: order.details.map(detail => ({
      quantity: detail.quantity,
      name: detail.product?.name || `Producto #${detail.productId}`,
      sku: detail.product?.sku ?? null,
      unitPrice: Number(detail.unitPrice ?? 0),
      subtotal: Number(detail.subtotal ?? 0),
      taxAmount: Number(detail.taxAmount ?? 0)
    })),
    subtotal: total - taxAmount,
    taxAmount,
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
