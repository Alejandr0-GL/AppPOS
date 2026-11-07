export interface CompanyInfo {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email?: string;
}

export interface ReceiptItem {
  quantity: number;
  name: string;
  sku?: string | null;
  unitPrice: number;
  /** Valor de la línea SIN impuesto (cantidad × precio): las líneas suman el Subtotal. */
  subtotal: number;
  taxAmount: number;
  /** INV-01: etiqueta del impuesto de la línea (p. ej. "IVA 19%"); null si no lleva. */
  taxLabel?: string | null;
}

/** INV-01: total de impuesto por tarifa. */
export interface ReceiptTaxLine {
  label: string;
  base: number;
  amount: number;
}

/** Datos listos para pintar el ticket térmico (independiente de la fuente: POS, historial, etc.). */
export interface ReceiptData {
  company: CompanyInfo;
  documentTitle: string;
  orderNumber: number;
  issuedAt: Date;
  cashier: string;
  sectionName: string;
  customerName: string;
  customerDocumentType: string;
  customerDocumentNumber: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  /** INV-01: placa del vehículo (si se registró). */
  vehiclePlate?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  /**
   * INV-01: mostrar el impuesto. Siempre en factura electrónica; en factura de venta sólo si
   * una venta antigua quedó con impuesto (hoy la factura de venta nunca cobra impuesto).
   */
  showTax: boolean;
  /** INV-01: desglose del impuesto por tarifa (vacío si no hay impuesto). */
  taxBreakdown: ReceiptTaxLine[];
  discount: number;
  total: number;
  paymentMethod: string;
  receivedAmount: number | null;
  changeAmount: number | null;
  status: string;
  thanksMessage: string;
  policyMessage: string;
}
