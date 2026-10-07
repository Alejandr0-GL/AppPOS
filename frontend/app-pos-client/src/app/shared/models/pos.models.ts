export interface Product {
  productId: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  salePrice: number;
  purchasePrice: number;
  taxId: number;
  categoryId: number;
}

export interface Customer {
  customerId: number;
  name: string;
  documentNumber: string;
  phone?: string;
  email?: string;
}

export interface CreateOrderDetailDto {
  productId: number;
  sectionId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderDto {
  userId: number;
  customerId: number;
  paymentMethod: string;
  invoiceType: 'POS' | 'ELECTRONIC';
  details: CreateOrderDetailDto[];
}