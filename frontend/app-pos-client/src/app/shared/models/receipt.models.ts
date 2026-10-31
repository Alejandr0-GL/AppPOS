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
  subtotal: number;
  taxAmount: number;
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
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: string;
  receivedAmount: number | null;
  changeAmount: number | null;
  status: string;
  thanksMessage: string;
  policyMessage: string;
}
